"""Configuration package for BookedBarber V2."""

# Import settings directly from parent directory config.py
import importlib.util
import os

# Get path to config.py in parent directory
config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.py')
spec = importlib.util.spec_from_file_location("config_module", config_path)
config_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config_module)

# Export Settings class and create settings instance
Settings = config_module.Settings
settings = Settings()