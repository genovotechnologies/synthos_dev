"""
Optional imports for numpy and pandas.
This module provides fallbacks when numpy/pandas are not available (e.g., in CI).
"""

import logging

logger = logging.getLogger(__name__)

# Try to import numpy, provide fallback if not available
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    logger.warning("numpy not available, using fallback")
    NUMPY_AVAILABLE = False
    # Create a simple fallback
    class NumpyFallback:
        def __array__(self):
            return []
        
        def __getattr__(self, name):
            def fallback(*args, **kwargs):
                logger.warning(f"numpy.{name} called but numpy not available")
                return []
            return fallback
    
    np = NumpyFallback()

# Try to import pandas, provide fallback if not available
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    logger.warning("pandas not available, using fallback")
    PANDAS_AVAILABLE = False
    # Create a simple fallback
    class PandasFallback:
        def __init__(self, *args, **kwargs):
            logger.warning("pandas.DataFrame called but pandas not available")
            self.data = []
        
        def __getattr__(self, name):
            def fallback(*args, **kwargs):
                logger.warning(f"pandas.{name} called but pandas not available")
                return []
            return fallback
    
    class PandasModule:
        def __getattr__(self, name):
            if name == 'DataFrame':
                return PandasFallback
            def fallback(*args, **kwargs):
                logger.warning(f"pandas.{name} called but pandas not available")
                return []
            return fallback
    
    pd = PandasModule()

def check_data_dependencies():
    """Check if data processing dependencies are available."""
    if not NUMPY_AVAILABLE or not PANDAS_AVAILABLE:
        logger.warning("Data processing features may be limited - numpy/pandas not available")
        return False
    return True 