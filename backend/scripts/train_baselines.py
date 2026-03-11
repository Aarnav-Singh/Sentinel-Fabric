import os
import argparse
import torch
import torch.nn as nn
import torch.optim as optim
import structlog
import sys

# Add backend dir to path so we can import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.ml.temporal import TemporalTransformer
from app.ml.adversarial import LLMFingerprinter
from app.ml.vae import AnomalyVAE

logger = structlog.get_logger(__name__)

def train_temporal(model_path: str):
    logger.info("training_temporal_transformer")
    model = TemporalTransformer()
    optimizer = optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.MSELoss()
    
    # Generate random baseline sequence data representing "normal" behavior
    x = torch.randn(500, 50, 64)
    y = torch.ones(500, 1) * 0.1  # normal = low score
    
    model.train()
    for run in range(10):
        optimizer.zero_grad()
        out = model(x)
        loss = criterion(out, y)
        loss.backward()
        optimizer.step()
        
    torch.save(model.state_dict(), model_path)
    logger.info("temporal_model_saved", path=model_path, final_loss=loss.item())


def train_llm_fingerprinter(model_path: str):
    logger.info("training_llm_fingerprinter")
    model = LLMFingerprinter(input_dim=256)
    optimizer = optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.BCELoss()
    
    # Train it to classify standard API JSONs as human (0.1)
    x = torch.randn(500, 256)
    y = torch.zeros(500, 1) + 0.1
    
    model.train()
    for run in range(15):
        optimizer.zero_grad()
        out = model(x)
        loss = criterion(out, y)
        loss.backward()
        optimizer.step()
        
    torch.save(model.state_dict(), model_path)
    logger.info("llm_fingerprinter_saved", path=model_path, final_loss=loss.item())

def train_vae(model_path: str):
    logger.info("training_vae")
    model = AnomalyVAE(input_dim=128, latent_dim=16)
    optimizer = optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.MSELoss()
    
    x = torch.randn(500, 128)
    
    model.train()
    for run in range(15):
        optimizer.zero_grad()
        recon, mu, logvar = model(x)
        recon_loss = criterion(recon, x)
        kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
        loss = recon_loss + 0.001 * kl_loss
        loss.backward()
        optimizer.step()
        
    torch.save(model.state_dict(), model_path)
    logger.info("vae_saved", path=model_path, final_loss=loss.item())

def main():
    parser = argparse.ArgumentParser()
    # default to backend/models relative to script
    default_out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
    parser.add_argument("--out-dir", default=default_out, help="Directory to save weights")
    args = parser.parse_args()
    
    os.makedirs(args.out_dir, exist_ok=True)
    
    train_temporal(os.path.join(args.out_dir, "temporal.pth"))
    train_llm_fingerprinter(os.path.join(args.out_dir, "llm_fingerprint.pth"))
    train_vae(os.path.join(args.out_dir, "vae.pth"))
    logger.info("baselines_generated_success", out_dir=args.out_dir)

if __name__ == "__main__":
    main()
