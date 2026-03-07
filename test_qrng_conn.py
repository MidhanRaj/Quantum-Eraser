import os
import logging
from web3 import Web3
from dotenv import load_dotenv

# Set up logging to see what's happening
logging.basicConfig(level=logging.INFO)

# Path to the .env file
env_path = r"c:\Users\NEW\Downloads\Annihilator-main\Annihilator-main\ss\SecureErase_fixed\.env"
load_dotenv(env_path)

def test_qrng():
    token = os.environ.get("IBM_QUANTUM_TOKEN", "").strip()
    print(f"Token found: {'Yes' if token else 'No'}")
    
    try:
        from qiskit import QuantumCircuit
        from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
        print("Qiskit libraries imported successfully.")
        
        service = QiskitRuntimeService(channel="ibm_quantum_platform", token=token)
        backends = service.backends(operational=True, simulator=False)
        print(f"Available backends: {[b.name for b in backends]}")
        
    except ImportError as e:
        print(f"Library missing: {e}")
    except Exception as e:
        print(f"IBM Quantum connection failed: {e}")

if __name__ == "__main__":
    test_qrng()
