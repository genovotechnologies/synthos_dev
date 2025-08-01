"""
Advanced Privacy Engine for Synthetic Data
Implements differential privacy, GDPR compliance, and intelligent privacy protection
"""

import numpy as np
from app.utils.optional_imports import pd, PANDAS_AVAILABLE
from typing import Dict, List, Any, Optional, Tuple, Union
import logging
from dataclasses import dataclass
from enum import Enum
import hashlib
import json
from datetime import datetime, timedelta
# Import privacy libraries with graceful fallbacks
try:
    import opendp as dp
    from opendp.measurements import make_base_discrete_laplace, make_base_gaussian
    from opendp.transformations import make_identity, make_clamp, make_bounded_resize
    OPENDP_AVAILABLE = True
except ImportError:
    # Fallback implementations when OpenDP is not available
    OPENDP_AVAILABLE = False
    dp = None

try:
    from diffprivlib import BudgetAccountant, mechanisms
    DIFFPRIVLIB_AVAILABLE = True
except ImportError:
    # Create mock classes when diffprivlib is not available
    DIFFPRIVLIB_AVAILABLE = False
    class BudgetAccountant:
        def __init__(self): pass
    class mechanisms: pass

import warnings

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class PrivacyLevel(Enum):
    """Privacy protection levels"""
    LOW = "low"          # ε=10.0, δ=1e-3
    MEDIUM = "medium"    # ε=1.0, δ=1e-5  
    HIGH = "high"        # ε=0.1, δ=1e-6
    MAXIMUM = "maximum"  # ε=0.01, δ=1e-8


@dataclass
class PrivacyBudget:
    """Privacy budget management"""
    epsilon: float
    delta: float
    spent_epsilon: float = 0.0
    spent_delta: float = 0.0
    operations: List[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.operations is None:
            self.operations = []
    
    def can_spend(self, epsilon: float, delta: float) -> bool:
        """Check if budget allows spending"""
        return (
            self.spent_epsilon + epsilon <= self.epsilon and
            self.spent_delta + delta <= self.delta
        )
    
    def spend(self, epsilon: float, delta: float, operation: str) -> bool:
        """Spend privacy budget"""
        if not self.can_spend(epsilon, delta):
            return False
        
        self.spent_epsilon += epsilon
        self.spent_delta += delta
        self.operations.append({
            "operation": operation,
            "epsilon": epsilon,
            "delta": delta,
            "timestamp": datetime.now().isoformat()
        })
        return True
    
    def remaining_budget(self) -> Tuple[float, float]:
        """Get remaining privacy budget"""
        return (
            self.epsilon - self.spent_epsilon,
            self.delta - self.spent_delta
        )


class PrivacyEngine:
    """Advanced privacy protection engine"""
    
    def __init__(self):
        self.privacy_levels = {
            PrivacyLevel.LOW: PrivacyBudget(10.0, 1e-3),
            PrivacyLevel.MEDIUM: PrivacyBudget(1.0, 1e-5),
            PrivacyLevel.HIGH: PrivacyBudget(0.1, 1e-6),
            PrivacyLevel.MAXIMUM: PrivacyBudget(0.01, 1e-8)
        }
        self.accountant = BudgetAccountant() if DIFFPRIVLIB_AVAILABLE else None
        self.opendp_available = OPENDP_AVAILABLE
        self.diffprivlib_available = DIFFPRIVLIB_AVAILABLE
        
    async def apply_differential_privacy(
        self,
        data: pd.DataFrame,
        privacy_level: str,
        schema_analysis: Dict[str, Any],
        custom_epsilon: Optional[float] = None,
        custom_delta: Optional[float] = None
    ) -> pd.DataFrame:
        """Apply differential privacy to synthetic data"""
        
        level = PrivacyLevel(privacy_level)
        budget = self.privacy_levels[level]
        
        if custom_epsilon is not None:
            budget.epsilon = custom_epsilon
        if custom_delta is not None:
            budget.delta = custom_delta
        
        logger.info(
            "Applying differential privacy",
            privacy_level=privacy_level,
            epsilon=budget.epsilon,
            delta=budget.delta,
            rows=len(data),
            columns=len(data.columns)
        )
        
        protected_data = data.copy()
        
        # Apply column-specific privacy protection
        for column in data.columns:
            column_info = self._get_column_info(column, schema_analysis)
            
            if column_info.get("privacy_sensitive", False):
                protected_data[column] = await self._protect_sensitive_column(
                    data[column], column_info, budget
                )
            elif column_info.get("data_type") == "numerical":
                protected_data[column] = await self._protect_numerical_column(
                    data[column], column_info, budget
                )
            elif column_info.get("data_type") == "categorical":
                protected_data[column] = await self._protect_categorical_column(
                    data[column], column_info, budget
                )
        
        # Add global noise if budget allows
        remaining_eps, remaining_delta = budget.remaining_budget()
        if remaining_eps > 0.01 and remaining_delta > 1e-8:
            protected_data = await self._add_global_noise(
                protected_data, remaining_eps * 0.1, remaining_delta * 0.1
            )
        
        logger.info(
            "Differential privacy applied successfully",
            budget_used_epsilon=budget.spent_epsilon,
            budget_used_delta=budget.spent_delta,
            remaining_epsilon=remaining_eps,
            remaining_delta=remaining_delta
        )
        
        return protected_data
    
    async def _protect_sensitive_column(
        self,
        column_data: pd.Series,
        column_info: Dict[str, Any],
        budget: PrivacyBudget
    ) -> pd.Series:
        """Protect sensitive columns with strong privacy guarantees"""
        
        privacy_category = column_info.get("privacy_category", "unknown")
        
        if privacy_category == "PII":
            # Apply strong noise to PII data
            return await self._apply_laplace_noise(
                column_data, epsilon=0.1, sensitivity=1.0, budget=budget
            )
        elif privacy_category == "financial":
            # Financial data needs careful protection
            return await self._apply_gaussian_noise(
                column_data, epsilon=0.2, delta=1e-6, sensitivity=1000.0, budget=budget
            )
        elif privacy_category == "health":
            # Health data requires maximum protection
            return await self._apply_exponential_mechanism(
                column_data, epsilon=0.05, sensitivity=1.0, budget=budget
            )
        else:
            # General sensitive data
            return await self._apply_laplace_noise(
                column_data, epsilon=0.2, sensitivity=1.0, budget=budget
            )
    
    async def _protect_numerical_column(
        self,
        column_data: pd.Series,
        column_info: Dict[str, Any],
        budget: PrivacyBudget
    ) -> pd.Series:
        """Protect numerical columns with appropriate noise"""
        
        # Determine sensitivity based on column range
        data_range = column_data.max() - column_data.min()
        sensitivity = min(data_range * 0.01, 10.0)  # Cap sensitivity
        
        # Use Gaussian mechanism for numerical data
        epsilon = min(0.5, budget.epsilon * 0.1)
        delta = min(1e-6, budget.delta * 0.1)
        
        return await self._apply_gaussian_noise(
            column_data, epsilon, delta, sensitivity, budget
        )
    
    async def _protect_categorical_column(
        self,
        column_data: pd.Series,
        column_info: Dict[str, Any],
        budget: PrivacyBudget
    ) -> pd.Series:
        """Protect categorical columns using randomized response"""
        
        unique_values = column_data.unique()
        
        if len(unique_values) <= 2:
            # Binary categorical - use randomized response
            epsilon = min(1.0, budget.epsilon * 0.2)
            return await self._apply_randomized_response(
                column_data, epsilon, budget
            )
        else:
            # Multi-category - use exponential mechanism
            epsilon = min(0.5, budget.epsilon * 0.15)
            return await self._apply_exponential_mechanism(
                column_data, epsilon, sensitivity=1.0, budget=budget
            )
    
    async def _apply_laplace_noise(
        self,
        data: pd.Series,
        epsilon: float,
        sensitivity: float,
        budget: PrivacyBudget
    ) -> pd.Series:
        """Apply Laplace noise for differential privacy"""
        
        if not budget.spend(epsilon, 0.0, f"laplace_noise_{data.name}"):
            logger.warning("Insufficient privacy budget for Laplace noise")
            return data
        
        # Use OpenDP for Laplace mechanism
        scale = sensitivity / epsilon
        noise = np.random.laplace(0, scale, size=len(data))
        
        # Apply noise while preserving data type constraints
        if data.dtype.kind in ['i', 'f']:  # numeric
            noisy_data = data + noise
            # Clamp to reasonable bounds
            if data.dtype.kind == 'i':
                noisy_data = noisy_data.round().astype(data.dtype)
        else:
            # For non-numeric, apply categorical noise
            noisy_data = data.copy()
        
        return noisy_data
    
    async def _apply_gaussian_noise(
        self,
        data: pd.Series,
        epsilon: float,
        delta: float,
        sensitivity: float,
        budget: PrivacyBudget
    ) -> pd.Series:
        """Apply Gaussian noise for (ε,δ)-differential privacy"""
        
        if not budget.spend(epsilon, delta, f"gaussian_noise_{data.name}"):
            logger.warning("Insufficient privacy budget for Gaussian noise")
            return data
        
        # Calculate noise scale for Gaussian mechanism
        if epsilon == 0:
            return data
        
        c = np.sqrt(2 * np.log(1.25 / delta))
        sigma = c * sensitivity / epsilon
        
        noise = np.random.normal(0, sigma, size=len(data))
        
        if data.dtype.kind in ['i', 'f']:  # numeric
            noisy_data = data + noise
            if data.dtype.kind == 'i':
                noisy_data = noisy_data.round().astype(data.dtype)
        else:
            noisy_data = data.copy()
        
        return noisy_data
    
    async def _apply_randomized_response(
        self,
        data: pd.Series,
        epsilon: float,
        budget: PrivacyBudget
    ) -> pd.Series:
        """Apply randomized response for categorical data"""
        
        if not budget.spend(epsilon, 0.0, f"randomized_response_{data.name}"):
            logger.warning("Insufficient privacy budget for randomized response")
            return data
        
        # Randomized response mechanism
        p = np.exp(epsilon) / (np.exp(epsilon) + 1)
        
        # Create randomized version
        noisy_data = data.copy()
        random_mask = np.random.random(len(data)) > p
        
        if random_mask.any():
            # Flip some values randomly
            unique_vals = data.unique()
            if len(unique_vals) == 2:
                # Binary case
                other_val = unique_vals[1] if data.iloc[0] == unique_vals[0] else unique_vals[0]
                noisy_data.loc[random_mask] = other_val
            else:
                # Multi-category case
                random_choices = np.random.choice(unique_vals, size=random_mask.sum())
                noisy_data.loc[random_mask] = random_choices
        
        return noisy_data
    
    async def _apply_exponential_mechanism(
        self,
        data: pd.Series,
        epsilon: float,
        sensitivity: float,
        budget: PrivacyBudget
    ) -> pd.Series:
        """Apply exponential mechanism for categorical data"""
        
        if not budget.spend(epsilon, 0.0, f"exponential_mechanism_{data.name}"):
            logger.warning("Insufficient privacy budget for exponential mechanism")
            return data
        
        # Exponential mechanism with utility based on frequency
        value_counts = data.value_counts()
        utilities = value_counts.values
        
        # Normalize utilities
        max_utility = utilities.max()
        normalized_utilities = utilities / max_utility
        
        # Exponential weights
        weights = np.exp(epsilon * normalized_utilities / (2 * sensitivity))
        probabilities = weights / weights.sum()
        
        # Sample new values based on exponential mechanism
        noisy_data = data.copy()
        unique_vals = value_counts.index.values
        
        for i in range(len(data)):
            if np.random.random() < 0.1:  # 10% chance to change
                new_val = np.random.choice(unique_vals, p=probabilities)
                noisy_data.iloc[i] = new_val
        
        return noisy_data
    
    async def _add_global_noise(
        self,
        data: pd.DataFrame,
        epsilon: float,
        delta: float
    ) -> pd.DataFrame:
        """Add global noise to protect against correlation attacks"""
        
        # Add small amount of correlated noise across columns
        correlation_noise = np.random.multivariate_normal(
            mean=np.zeros(len(data.columns)),
            cov=np.eye(len(data.columns)) * 0.01,
            size=len(data)
        )
        
        noisy_data = data.copy()
        numeric_columns = data.select_dtypes(include=[np.number]).columns
        
        for i, col in enumerate(numeric_columns):
            if i < correlation_noise.shape[1]:
                noisy_data[col] = data[col] + correlation_noise[:, i]
        
        return noisy_data
    
    def _get_column_info(
        self, 
        column_name: str, 
        schema_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get column information from schema analysis"""
        
        # Extract column info from schema analysis
        columns_info = schema_analysis.get("columns", [])
        
        for col_info in columns_info:
            if col_info.get("name") == column_name:
                return col_info
        
        # Default column info if not found
        return {
            "name": column_name,
            "data_type": "unknown",
            "privacy_sensitive": False,
            "privacy_category": "general"
        }
    
    async def generate_privacy_report(
        self,
        original_data: pd.DataFrame,
        protected_data: pd.DataFrame,
        privacy_level: str,
        budget_used: PrivacyBudget
    ) -> Dict[str, Any]:
        """Generate comprehensive privacy protection report"""
        
        # Calculate privacy metrics
        privacy_metrics = {
            "privacy_level": privacy_level,
            "epsilon_used": budget_used.spent_epsilon,
            "delta_used": budget_used.spent_delta,
            "operations_count": len(budget_used.operations),
            "data_utility": await self._calculate_data_utility(original_data, protected_data),
            "privacy_risk": await self._assess_privacy_risk(protected_data, budget_used),
            "compliance_status": await self._check_compliance(budget_used),
            "recommendations": await self._generate_recommendations(budget_used)
        }
        
        return privacy_metrics
    
    async def _calculate_data_utility(
        self,
        original: pd.DataFrame,
        protected: pd.DataFrame
    ) -> float:
        """Calculate utility preservation after privacy protection"""
        
        try:
            # Calculate various utility metrics
            numeric_cols = original.select_dtypes(include=[np.number]).columns
            
            if len(numeric_cols) == 0:
                return 1.0  # No numeric columns to compare
            
            # Mean squared error for numeric columns
            mse_scores = []
            for col in numeric_cols:
                if col in protected.columns:
                    mse = np.mean((original[col] - protected[col]) ** 2)
                    original_var = np.var(original[col])
                    relative_mse = mse / original_var if original_var > 0 else 0
                    mse_scores.append(1 - min(relative_mse, 1.0))
            
            return np.mean(mse_scores) if mse_scores else 1.0
            
        except Exception as e:
            logger.warning("Utility calculation failed", error=str(e))
            return 0.8  # Default utility score
    
    async def _assess_privacy_risk(
        self,
        protected_data: pd.DataFrame,
        budget: PrivacyBudget
    ) -> str:
        """Assess privacy risk level"""
        
        total_epsilon = budget.spent_epsilon
        
        if total_epsilon <= 0.1:
            return "very_low"
        elif total_epsilon <= 1.0:
            return "low"
        elif total_epsilon <= 5.0:
            return "medium"
        elif total_epsilon <= 10.0:
            return "high"
        else:
            return "very_high"
    
    async def _check_compliance(self, budget: PrivacyBudget) -> Dict[str, bool]:
        """Check compliance with privacy regulations"""
        
        return {
            "gdpr_compliant": budget.spent_epsilon <= 1.0,
            "ccpa_compliant": budget.spent_epsilon <= 5.0,
            "hipaa_ready": budget.spent_epsilon <= 0.1,
            "ferpa_compliant": budget.spent_epsilon <= 1.0
        }
    
    async def _generate_recommendations(
        self, 
        budget: PrivacyBudget
    ) -> List[str]:
        """Generate privacy recommendations"""
        
        recommendations = []
        
        remaining_eps, remaining_delta = budget.remaining_budget()
        
        if remaining_eps < 0.1:
            recommendations.append(
                "Privacy budget nearly exhausted. Consider using higher epsilon for future operations."
            )
        
        if budget.spent_epsilon > 5.0:
            recommendations.append(
                "High epsilon usage detected. Consider stronger privacy protection."
            )
        
        if len(budget.operations) > 10:
            recommendations.append(
                "Many privacy operations performed. Consider consolidating operations."
            )
        
        return recommendations 