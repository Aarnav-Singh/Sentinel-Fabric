"""Phase 35A — Adversarial LLM Fingerprinter Training.

Trains the PyTorch NN intended to distinguish LLM-generated payloads
from human-generated payloads. Real implementation would ingest DARPA OpTC
for human baselines and generated prompt outputs for the AI set.

Here, we simulate the distributions (LLM payloads tend to have more
regular structure, lower entropy variance, and specific vocabulary
encodings in the 256-dim payload embedding).
"""
import sys
import logging
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

MODELS_DIR = PROJECT_ROOT / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

from app.ml.adversarial import LLMFingerprinter

def generate_adversarial_dataset(n_samples=10000) -> tuple[torch.Tensor, torch.Tensor]:
    """Generate 256-dim vectors representing payload embeddings."""
    logger.info("Generating synthetic payload embeddings (Human vs. LLM)...")
    
    # 0 = Human, 1 = LLM
    y = np.random.randint(0, 2, n_samples)
    X = np.zeros((n_samples, 256), dtype=np.float32)

    rng = np.random.RandomState(42)

    for i in range(n_samples):
        if y[i] == 0:
            # Human payload: higher variance, more chaotic byte distributions
            # Occasional large spikes from random strings, high entropy
            X[i] = rng.normal(loc=0.0, scale=1.0, size=256)
            # Add some heavy tails
            X[i] += rng.standard_cauchy(256) * 0.1
        else:
            # LLM payload: Highly structured language patterns
            # Lower variance, smooth grammar embeddings, specific 'polite' token regions
            X[i] = rng.normal(loc=0.5, scale=0.5, size=256)
            # Simulate structural regularity (e.g. repeated sentence structures)
            X[i, 10:50] = rng.normal(loc=1.2, scale=0.1, size=40)
            X[i, 200:220] = rng.normal(loc=-0.8, scale=0.2, size=20)
            
    # Normalize features
    X = (X - X.mean(axis=0)) / (X.std(axis=0) + 1e-8)
    
    return torch.tensor(X, dtype=torch.float32), torch.tensor(y, dtype=torch.float32).unsqueeze(1)


def train_model():
    logger.info("Initializing LLMFingerprinter (Binary Classifier)...")
    model = LLMFingerprinter(input_dim=256)
    
    X, y = generate_adversarial_dataset(15000)
    
    # Split train/val
    split = int(0.8 * len(X))
    X_train, y_train = X[:split], y[:split]
    X_val, y_val = X[split:], y[split:]
    
    train_loader = DataLoader(TensorDataset(X_train, y_train), batch_size=128, shuffle=True)
    val_loader = DataLoader(TensorDataset(X_val, y_val), batch_size=128, shuffle=False)
    
    criterion = nn.BCELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-5)
    
    epochs = 10
    logger.info(f"Starting training over {epochs} epochs...")
    
    best_val_loss = float('inf')
    best_state = None
    
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        correct = 0
        total = 0
        
        for batch_X, batch_y in train_loader:
            optimizer.zero_grad()
            outputs = model(batch_X)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * batch_X.size(0)
            preds = (outputs > 0.5).float()
            correct += (preds == batch_y).sum().item()
            total += batch_y.size(0)
            
        train_loss /= total
        train_acc = correct / total
        
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for batch_X, batch_y in val_loader:
                outputs = model(batch_X)
                loss = criterion(outputs, batch_y)
                val_loss += loss.item() * batch_X.size(0)
                preds = (outputs > 0.5).float()
                val_correct += (preds == batch_y).sum().item()
                val_total += batch_y.size(0)
                
        val_loss /= val_total
        val_acc = val_correct / val_total
        
        logger.info(f"Epoch {epoch+1:02d} | Train Loss: {train_loss:.4f} Acc: {train_acc:.4f} | Val Loss: {val_loss:.4f} Acc: {val_acc:.4f}")
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = model.state_dict()
            
    save_path = MODELS_DIR / "llm_fingerprint.pth"
    model.load_state_dict(best_state)
    torch.save(model.state_dict(), save_path)
    logger.info(f"Training Complete. Best Validation Accuracy: {val_acc:.4f}")
    logger.info(f"Saved adversarial model weights to {save_path}")

if __name__ == "__main__":
    train_model()
