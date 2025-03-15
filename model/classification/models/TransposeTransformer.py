import torch
import torch.nn as nn
import torch.nn.functional as F
from timm.layers import DropPath, trunc_normal_
import math

class Embedding(nn.Module):
    def __init__(self,device):
        super().__init__()
        self.device = device
    def forward(self, x):
        batch,  channel, time, height, width = x.size()
        basic = torch.ones( (height,1), dtype=torch.int16)
        basic2 = torch.ones( (width,1), dtype=torch.int16)
        basic2[width//2,0] = 0 
        position_embedding = basic@basic2.T + basic2
        position_embedding = torch.sqrt(position_embedding.to(self.device))*2.5
        x = x + position_embedding
        x = x.view(batch, channel, time, height * width) 
        
        return x
    
class Attention_(nn.Module):

    def __init__(self, num_heads, num_axis, num_dim):
        super().__init__()
        self.num_heads = num_heads
        self.num_axis = num_axis
        self.num_dim = num_dim

        self.w_q = nn.ModuleList([nn.Linear(self.num_dim, self.num_dim)
                                  for _ in range(self.num_heads)])
        self.w_k = nn.ModuleList([nn.Linear(self.num_dim, self.num_dim) 
                                  for _ in range(self.num_heads)])
        self.w_v = nn.ModuleList([nn.Linear(self.num_dim, self.num_dim) 
                                  for _ in range(self.num_heads)])
        
        self.w_o = nn.ModuleList([nn.Linear(self.num_dim, self.num_dim) 
                                  for _ in range(self.num_heads)])
        
    def forward(self, x):
        
        q_outputs = []
        k_outputs = []
        v_outputs = []
        for i in range(self.num_heads):
            # 각 헤드별 선형 투영
            q_i = self.w_q[i](x[:,i,:,:]) 
            k_i = self.w_k[i](x[:,i,:,:]) 
            v_i = self.w_v[i](x[:,i,:,:]) 
            q_outputs.append(q_i)
            k_outputs.append(k_i)
            v_outputs.append(v_i)

        q = torch.stack(q_outputs, dim=1)
        k = torch.stack(k_outputs, dim=1)
        v = torch.stack(v_outputs, dim=1)

        score = torch.matmul(q,k.transpose(-2,-1))
        score = score / math.sqrt(self.num_dim)
        attention_weights = F.softmax(score, dim=-1)
        context = torch.matmul(attention_weights, v)
        
        for i in range(self.num_heads):
            context_i = self.w_o[i](context[:,i,:,:])
            context[:,i,:,:] = context_i

        return context
    
class Attention(nn.Module):
    def __init__(self, num_heads, num_axis, num_dim):
        super().__init__()
        self.num_heads = num_heads
        self.num_axis = num_axis
        self.num_dim = num_dim

        self.w_q = nn.Linear(num_axis*self.num_dim, num_axis*self.num_dim)
        self.w_k = nn.Linear(num_axis*self.num_dim, num_axis*self.num_dim)
        self.w_v = nn.Linear(num_axis*self.num_dim, num_axis*self.num_dim)
        self.w_o = nn.Linear(num_axis*self.num_dim, num_axis*self.num_dim)
        self.apply(self._init_weights)
        
    def _init_weights(self, m):
        if isinstance(m, nn.Linear):
            trunc_normal_(m.weight, std=.02)
            if isinstance(m, nn.Linear) and m.bias is not None:
                nn.init.constant_(m.bias, 0)
                                  
    def forward(self, x):
        x = x.view(-1, self.num_heads, self.num_axis*self.num_dim)
        q = self.w_q(x).view(-1, self.num_heads, self.num_axis, self.num_dim)
        k = self.w_k(x).view(-1, self.num_heads, self.num_axis, self.num_dim)
        v = self.w_v(x).view(-1, self.num_heads, self.num_axis, self.num_dim)

        score = torch.matmul(q,k.transpose(-2,-1))
        score = score / math.sqrt(self.num_dim)
        attention_weights = F.softmax(score, dim=-1)

        context = torch.matmul(attention_weights, v)
        context = context.view(-1, self.num_heads,self.num_axis*self.num_dim)
        context = self.w_o(context).view(-1, self.num_heads, self.num_axis, self.num_dim)
        return context
    
class FeedForward(nn.Module):
    def __init__(self, dim, expand_ratio=2):
        super().__init__()
        hidden_dim = dim * expand_ratio
        self.w1 = nn.Linear(dim, hidden_dim)
        self.w2 = nn.Linear(hidden_dim, dim)
        self.apply(self._init_weights)

    def _init_weights(self, m):
        if isinstance(m, nn.Linear):
            trunc_normal_(m.weight, std=.02)
            if isinstance(m, nn.Linear) and m.bias is not None:
                nn.init.constant_(m.bias, 0)
                                  
    def forward(self, x):
        return self.w2(F.silu(self.w1(x)))
    
class TransposeTransformerBlock(nn.Module):
    def __init__(self,  num_heads, num_axis,num_dim, expand_ratio,tag, dropout=0., attn_drop_rate=0., droppath=0.):
        super().__init__()
        self.token_norm = nn.LayerNorm(num_dim)
        self.token_mixer = Attention(num_heads, num_axis, num_dim)
        self.channel_norm = nn.LayerNorm(num_dim)
        self.channel_mixer = FeedForward(num_dim, expand_ratio)
        self.droppath = DropPath(droppath) if droppath > 0. else nn.Identity()
        self.tag = tag
        self.apply(self._init_weights)

    def _init_weights(self, m):
        if isinstance(m, nn.Linear):
            trunc_normal_(m.weight, std=.02)
            if isinstance(m, nn.Linear) and m.bias is not None:
                nn.init.constant_(m.bias, 0)
                                  
    def forward(self, x):
        #print('transformer',self.tag)
        x = self.token_norm(x)
        x = self.token_mixer(x)
        x = x + self.droppath(x)
        x = x + self.droppath(self.channel_mixer(self.channel_norm(x)))
        return x
    
class TransposeTransformer(nn.Module):
    def __init__(self, 
                 num_blocks=3, 
                 num_head=10,
                 num_axis=12, 
                 num_dim=9,
                 num_classes=6, 
                 image_size=3,
                 patch_size=1, 
                 expand_ratio=2, 
                 droppath=0.0, 
                 dropout=0.0,
                 device='cuda'
        ):
        super().__init__()
        self.num_head = num_head
        self.num_axis = num_axis
        self.num_dim = num_dim
        self.num_classes = num_classes
        self.image_size = image_size
        self.num_blocks = num_blocks

        self.embedding_layer = Embedding(device)

        self.time_layers = nn.Sequential(*[
            TransposeTransformerBlock(self.num_head, self.num_axis, self.num_dim,
                                       expand_ratio,'time',dropout=dropout, droppath=droppath)  
            for _ in range(self.num_blocks)]
        )
        self.band_layers = nn.Sequential(*[
            TransposeTransformerBlock( self.num_axis, self.num_head, self.num_dim, 
                                      expand_ratio,'band',dropout=dropout, droppath=droppath)  
            for _ in range(self.num_blocks)]
        )
        self.spatial_layers = nn.Sequential(*[
            TransposeTransformerBlock( self.num_axis, self.num_dim, self.num_head, 
                                      expand_ratio,'spatial',dropout=dropout, droppath=droppath)  
            for _ in range(self.num_blocks)]
        )

        self.dropout = nn.Dropout(dropout)
        self.norm = nn.LayerNorm(self.num_head* self.num_axis)
        self.head = nn.Linear( self.num_head* self.num_axis , num_classes)
    
        self.apply(self._init_weights)

    def _init_weights(self, m):
        if isinstance(m, nn.Linear):
            trunc_normal_(m.weight, std=.02)
            if isinstance(m, nn.Linear) and m.bias is not None:
                nn.init.constant_(m.bias, 0)

    def forward(self, x):
        x = self.embedding_layer(x)

        for idx in range(self.num_blocks):
            #print('time',x.shape)
            x = self.time_layers[idx](x)
            x = x.permute(0,2,1,3)
            #print('band',x.shape)
            x = self.band_layers[idx](x)
            x = x.permute(0,1,3,2)
            #print('spatial',x.shape)
            x = self.spatial_layers[idx](x)
            x = x.permute(0,3,1,2)
        x = x.mean([3]).view(-1,self.num_head* self.num_axis )
        x = self.norm(x)
        x = self.dropout(x)
        x = self.head(x)
        return x