"""Evaluate LLM Fingerprinter."""
import sys
import logging
from pathlib import Path
import torch

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.ml.adversarial import LLMFingerprinter
from scripts.train_adversarial import generate_adversarial_dataset

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def evaluate_model():
    model_path = PROJECT_ROOT / "models" / "llm_fingerprint.pth"
    if not model_path.exists():
        logger.error(f"Model path {model_path} does not exist. Please train it first.")
        return
    
    model = LLMFingerprinter(input_dim=256)
    model.load_state_dict(torch.load(model_path, map_location="cpu", weights_only=True))
    model.eval()
    
    logger.info("Generating synthetic evaluation dataset...")
    X, y = generate_adversarial_dataset(2000)
    with torch.no_grad():
        outputs = model(X)
        preds = (outputs > 0.5).float()
        
    correct = (preds == y).sum().item()
    total = y.size(0)
    acc = correct / total
    
    logger.info(f"LLM Fingerprinter Evaluation Accuracy: {acc:.4f} ({correct}/{total})")

if __name__ == "__main__":
    evaluate_model()
