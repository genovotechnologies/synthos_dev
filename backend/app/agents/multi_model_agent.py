"""
Multi-Model Agent for Synthos
Orchestrates Claude, OpenAI, and custom models for optimal synthetic data generation
Leverages strengths of different AI providers and custom trained models
"""

import asyncio
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from datetime import datetime
import logging
from enum import Enum
import openai
from anthropic import AsyncAnthropic

from app.core.config import settings
from app.core.logging import get_logger
from app.models.dataset import Dataset, CustomModel, GenerationJob
from app.models.user import User, SubscriptionTier
from app.agents.claude_agent import AdvancedClaudeAgent, GenerationConfig, ModelType
from app.agents.enhanced_realism_engine import EnhancedRealismEngine, RealismConfig, IndustryDomain

logger = get_logger(__name__)


class AIProvider(Enum):
    """Supported AI providers"""
    CLAUDE = "claude"
    OPENAI = "openai"
    CUSTOM = "custom"
    HYBRID = "hybrid"


class OpenAIModel(Enum):
    """OpenAI models for synthetic data generation"""
    GPT_4_TURBO = "gpt-4-turbo-preview"
    GPT_4 = "gpt-4"
    GPT_3_5_TURBO = "gpt-3.5-turbo-0125"


@dataclass
class ModelCapabilities:
    """Define capabilities and strengths of each model type"""
    provider: AIProvider
    model_name: str
    strengths: List[str]
    weaknesses: List[str]
    best_for_domains: List[IndustryDomain]
    supported_strategies: List[str]
    cost_per_1k_tokens: float
    max_context_length: int
    generation_speed: str  # "fast", "medium", "slow"
    accuracy_rating: float  # 0-1 scale


@dataclass
class MultiModelConfig:
    """Configuration for multi-model generation"""
    primary_provider: AIProvider = AIProvider.CLAUDE
    fallback_providers: List[AIProvider] = None
    use_ensemble: bool = False
    ensemble_voting: str = "weighted"  # "majority", "weighted", "consensus"
    quality_threshold: float = 0.95
    cost_optimization: bool = True
    speed_optimization: bool = False
    custom_model_preference: bool = True  # Prefer custom models when available
    provider_weights: Dict[AIProvider, float] = None


class MultiModelAgent:
    """
    Advanced multi-model agent that orchestrates different AI providers
    and custom models for optimal synthetic data generation
    """
    
    def __init__(self):
        self.claude_agent = AdvancedClaudeAgent()
        self.realism_engine = EnhancedRealismEngine()
        
        # Initialize OpenAI
        if settings.OPENAI_API_KEY:
            openai.api_key = settings.OPENAI_API_KEY
            self.openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            self.openai_client = None
            logger.warning("OpenAI API key not configured")
        
        # Model capabilities database
        self.model_capabilities = self._initialize_model_capabilities()
        
        # Custom model registry
        self.custom_model_registry = {}
        
    def _initialize_model_capabilities(self) -> Dict[str, ModelCapabilities]:
        """Initialize capabilities database for different models"""
        
        return {
            "claude-3-sonnet": ModelCapabilities(
                provider=AIProvider.CLAUDE,
                model_name="claude-3-sonnet-20240229",
                strengths=[
                    "Complex reasoning", "Business logic understanding", 
                    "Semantic consistency", "Domain expertise", "Large context"
                ],
                weaknesses=[
                    "Cost", "Speed for large datasets", "API rate limits"
                ],
                best_for_domains=[
                    IndustryDomain.HEALTHCARE, IndustryDomain.FINANCE, 
                    IndustryDomain.MANUFACTURING, IndustryDomain.GENERAL
                ],
                supported_strategies=["hybrid", "semantic", "reasoning"],
                cost_per_1k_tokens=0.003,
                max_context_length=200000,
                generation_speed="medium",
                accuracy_rating=0.96
            ),
            "claude-3-opus": ModelCapabilities(
                provider=AIProvider.CLAUDE,
                model_name="claude-3-opus-20240229",
                strengths=[
                    "Highest accuracy", "Complex domain understanding",
                    "Advanced reasoning", "Perfect business rules"
                ],
                weaknesses=[
                    "Highest cost", "Slower speed", "Overkill for simple data"
                ],
                best_for_domains=[
                    IndustryDomain.HEALTHCARE, IndustryDomain.FINANCE,
                    IndustryDomain.AEROSPACE, IndustryDomain.PHARMACEUTICAL
                ],
                supported_strategies=["premium", "critical", "enterprise"],
                cost_per_1k_tokens=0.015,
                max_context_length=200000,
                generation_speed="slow",
                accuracy_rating=0.98
            ),
            "gpt-4-turbo": ModelCapabilities(
                provider=AIProvider.OPENAI,
                model_name="gpt-4-turbo-preview",
                strengths=[
                    "Fast generation", "Good reasoning", "JSON output",
                    "Consistent formatting", "Large context"
                ],
                weaknesses=[
                    "Less domain expertise", "Occasional hallucinations",
                    "Weaker business logic"
                ],
                best_for_domains=[
                    IndustryDomain.RETAIL, IndustryDomain.GENERAL,
                    IndustryDomain.AUTOMOTIVE, IndustryDomain.ENERGY
                ],
                supported_strategies=["fast", "volume", "general"],
                cost_per_1k_tokens=0.001,
                max_context_length=128000,
                generation_speed="fast",
                accuracy_rating=0.89
            ),
            "gpt-3.5-turbo": ModelCapabilities(
                provider=AIProvider.OPENAI,
                model_name="gpt-3.5-turbo-0125",
                strengths=[
                    "Very fast", "Low cost", "Good for simple patterns",
                    "High throughput", "Reliable formatting"
                ],
                weaknesses=[
                    "Limited reasoning", "Simple business rules only",
                    "Less domain knowledge", "Shorter context"
                ],
                best_for_domains=[
                    IndustryDomain.GENERAL, IndustryDomain.RETAIL
                ],
                supported_strategies=["fast", "budget", "volume"],
                cost_per_1k_tokens=0.0005,
                max_context_length=16385,
                generation_speed="fast",
                accuracy_rating=0.82
            }
        }
    
    async def generate_synthetic_data(
        self,
        dataset: Dataset,
        config: GenerationConfig,
        job: GenerationJob,
        user: User,
        multi_config: MultiModelConfig = None
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Generate synthetic data using optimal model selection and ensemble methods
        """
        if not multi_config:
            multi_config = MultiModelConfig()
        
        logger.info(
            "Starting multi-model synthetic data generation",
            dataset_id=dataset.id,
            primary_provider=multi_config.primary_provider.value,
            use_ensemble=multi_config.use_ensemble
        )
        
        # Step 1: Determine optimal model strategy
        optimal_strategy = await self._determine_optimal_strategy(
            dataset, config, user, multi_config
        )
        
        # Step 2: Generate data using selected strategy
        if optimal_strategy["use_ensemble"]:
            synthetic_data, metrics = await self._ensemble_generation(
                dataset, config, job, optimal_strategy
            )
        else:
            synthetic_data, metrics = await self._single_model_generation(
                dataset, config, job, optimal_strategy
            )
        
        # Step 3: Apply enhanced realism processing
        enhanced_data, realism_metrics = await self._apply_enhanced_realism(
            synthetic_data, dataset, config, optimal_strategy
        )
        
        # Step 4: Combine metrics
        final_metrics = self._combine_metrics(metrics, realism_metrics, optimal_strategy)
        
        logger.info(
            "Multi-model generation complete",
            strategy_used=optimal_strategy["strategy"],
            models_used=optimal_strategy["models"],
            overall_quality=final_metrics.get("overall_quality", 0.0)
        )
        
        return enhanced_data, final_metrics
    
    async def _determine_optimal_strategy(
        self,
        dataset: Dataset,
        config: GenerationConfig,
        user: User,
        multi_config: MultiModelConfig
    ) -> Dict[str, Any]:
        """
        Determine the optimal model strategy based on dataset, user tier, and requirements
        """
        # Analyze dataset characteristics
        domain = await self._detect_industry_domain(dataset)
        complexity = await self._assess_dataset_complexity(dataset)
        
        # Check user capabilities
        user_capabilities = self._get_user_model_access(user)
        
        # Get available custom models
        custom_models = await self._get_user_custom_models(user, dataset)
        
        # Select optimal strategy
        strategy = {
            "domain": domain,
            "complexity": complexity,
            "user_tier": user.subscription_tier.value,
            "models": [],
            "use_ensemble": False,
            "strategy": "single_model",
            "custom_models": custom_models
        }
        
        # Enterprise: Full ensemble with Opus + custom models
        if user.subscription_tier == SubscriptionTier.ENTERPRISE:
            if custom_models and domain in [IndustryDomain.HEALTHCARE, IndustryDomain.FINANCE]:
                strategy.update({
                    "models": ["claude-3-opus", custom_models[0]["name"]],
                    "use_ensemble": True,
                    "strategy": "enterprise_ensemble",
                    "voting": "consensus"
                })
            else:
                strategy.update({
                    "models": ["claude-3-opus"],
                    "use_ensemble": False,
                    "strategy": "enterprise_premium",
                    "primary": "claude-3-opus"
                })
        
        # Growth: GPT-4 Turbo + custom models (up to 10)
        elif user.subscription_tier == SubscriptionTier.GROWTH:
            if custom_models:
                strategy.update({
                    "models": ["gpt-4-turbo", custom_models[0]["name"]],
                    "use_ensemble": False,
                    "strategy": "growth_custom",
                    "primary": "gpt-4-turbo"
                })
            else:
                strategy.update({
                    "models": ["gpt-4-turbo"],
                    "use_ensemble": False,
                    "strategy": "growth_fast",
                    "primary": "gpt-4-turbo"
                })
        
        # Professional: Claude Sonnet + GPT-3.5 (multi-model starts here)
        elif user.subscription_tier == SubscriptionTier.PROFESSIONAL:
            if config.rows > 50000:  # Use faster model for large datasets
                strategy.update({
                    "models": ["gpt-3.5-turbo", "claude-3-sonnet"],
                    "use_ensemble": False,
                    "strategy": "professional_speed",
                    "primary": "gpt-3.5-turbo"
                })
            else:
                strategy.update({
                    "models": ["claude-3-sonnet", "gpt-3.5-turbo"],
                    "use_ensemble": False,
                    "strategy": "professional_balanced",
                    "primary": "claude-3-sonnet"
                })
        
        # Starter/Free: Single Claude Sonnet only
        else:
            strategy.update({
                "models": ["claude-3-sonnet"],
                "use_ensemble": False,
                "strategy": "single_model",
                "primary": "claude-3-sonnet"
            })
        
        return strategy
    
    async def _ensemble_generation(
        self,
        dataset: Dataset,
        config: GenerationConfig,
        job: GenerationJob,
        strategy: Dict[str, Any]
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Generate synthetic data using ensemble of multiple models
        """
        logger.info("Starting ensemble generation", models=strategy["models"])
        
        # Generate data from each model in parallel
        generation_tasks = []
        for model_name in strategy["models"]:
            if model_name.startswith("claude"):
                task = self._generate_with_claude(dataset, config, job, model_name)
            elif model_name.startswith("gpt"):
                task = self._generate_with_openai(dataset, config, job, model_name)
            else:
                task = self._generate_with_custom_model(dataset, config, job, model_name)
            generation_tasks.append(task)
        
        # Wait for all generations to complete
        results = await asyncio.gather(*generation_tasks, return_exceptions=True)
        
        # Filter successful results
        successful_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.warning(f"Model {strategy['models'][i]} failed: {result}")
            else:
                successful_results.append(result)
        
        if not successful_results:
            raise Exception("All models failed to generate data")
        
        # Combine results using ensemble method
        if strategy.get("voting") == "consensus":
            combined_data = await self._consensus_ensemble(successful_results)
        elif strategy.get("voting") == "weighted":
            combined_data = await self._weighted_ensemble(successful_results, strategy)
        else:
            combined_data = await self._majority_ensemble(successful_results)
        
        # Calculate ensemble metrics
        ensemble_metrics = await self._calculate_ensemble_metrics(successful_results)
        
        return combined_data, ensemble_metrics
    
    async def _single_model_generation(
        self,
        dataset: Dataset,
        config: GenerationConfig,
        job: GenerationJob,
        strategy: Dict[str, Any]
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Generate synthetic data using a single optimal model
        """
        primary_model = strategy.get("primary", strategy["models"][0])
        
        logger.info("Starting single model generation", model=primary_model)
        
        if primary_model.startswith("claude"):
            return await self._generate_with_claude(dataset, config, job, primary_model)
        elif primary_model.startswith("gpt"):
            return await self._generate_with_openai(dataset, config, job, primary_model)
        else:
            return await self._generate_with_custom_model(dataset, config, job, primary_model)
    
    async def _generate_with_claude(
        self,
        dataset: Dataset,
        config: GenerationConfig,
        job: GenerationJob,
        model_name: str
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Generate using Claude models"""
        
        # Update config to use specified Claude model
        model_type = ModelType.CLAUDE_3_SONNET
        if "opus" in model_name:
            model_type = ModelType.CLAUDE_3_OPUS
        elif "haiku" in model_name:
            model_type = ModelType.CLAUDE_3_HAIKU
        
        config.model_type = model_type
        
        # Use existing Claude agent
        return await self.claude_agent.generate_synthetic_data(dataset, config, job)
    
    async def _generate_with_openai(
        self,
        dataset: Dataset,
        config: GenerationConfig,
        job: GenerationJob,
        model_name: str
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Generate using OpenAI models"""
        
        if not self.openai_client:
            raise Exception("OpenAI not configured")
        
        logger.info(f"Generating with OpenAI {model_name}")
        
        # Prepare dataset context for OpenAI
        schema_analysis = await self._analyze_dataset_with_openai(dataset, model_name)
        
        # Generate synthetic data
        synthetic_data = await self._openai_batch_generation(
            dataset, config, schema_analysis, model_name
        )
        
        # Calculate quality metrics
        quality_metrics = await self._assess_openai_quality(dataset, synthetic_data)
        
        return synthetic_data, quality_metrics
    
    async def _generate_with_custom_model(
        self,
        dataset: Dataset,
        config: GenerationConfig,
        job: GenerationJob,
        model_name: str
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Generate using custom trained models"""
        
        # Load custom model from registry
        custom_model = self.custom_model_registry.get(model_name)
        if not custom_model:
            raise Exception(f"Custom model {model_name} not found")
        
        logger.info(f"Generating with custom model {model_name}")
        
        # Run custom model inference
        synthetic_data = await self._run_custom_model_inference(
            custom_model, dataset, config
        )
        
        # Calculate quality metrics
        quality_metrics = await self._assess_custom_model_quality(
            dataset, synthetic_data, custom_model
        )
        
        return synthetic_data, quality_metrics
    
    async def _analyze_dataset_with_openai(
        self,
        dataset: Dataset,
        model_name: str
    ) -> Dict[str, Any]:
        """Analyze dataset using OpenAI for generation planning"""
        
        # Prepare dataset summary
        dataset_summary = {
            "name": dataset.name,
            "description": dataset.description,
            "columns": [
                {
                    "name": col.name,
                    "type": col.data_type.value,
                    "sample_values": col.get_sample_values()[:5],
                    "null_count": col.null_count,
                    "unique_values": col.unique_values
                }
                for col in dataset.columns
            ]
        }
        
        analysis_prompt = f"""
        Analyze this dataset for synthetic data generation:
        
        Dataset: {json.dumps(dataset_summary, indent=2)}
        
        Provide a JSON analysis with:
        1. Column types and generation strategies
        2. Relationships between columns
        3. Business rules and constraints
        4. Recommended generation approach
        
        Return only valid JSON.
        """
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": analysis_prompt}],
                temperature=0.3,
                max_tokens=2000
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            logger.warning(f"OpenAI analysis failed: {e}")
            return await self._fallback_dataset_analysis(dataset)
    
    async def _openai_batch_generation(
        self,
        dataset: Dataset,
        config: GenerationConfig,
        schema_analysis: Dict[str, Any],
        model_name: str
    ) -> pd.DataFrame:
        """Generate synthetic data in batches using OpenAI"""
        
        batch_size = min(1000, config.rows // 5)
        total_batches = (config.rows + batch_size - 1) // batch_size
        
        generated_batches = []
        
        for batch_idx in range(total_batches):
            current_batch_size = min(batch_size, config.rows - batch_idx * batch_size)
            
            batch_data = await self._generate_openai_batch(
                dataset, schema_analysis, current_batch_size, model_name
            )
            
            if batch_data is not None:
                generated_batches.append(batch_data)
        
        # Combine all batches
        if generated_batches:
            return pd.concat(generated_batches, ignore_index=True)
        else:
            raise Exception("Failed to generate any data batches")
    
    async def _generate_openai_batch(
        self,
        dataset: Dataset,
        schema_analysis: Dict[str, Any],
        batch_size: int,
        model_name: str
    ) -> pd.DataFrame:
        """Generate a single batch using OpenAI"""
        
        generation_prompt = f"""
        Generate {batch_size} rows of synthetic data based on this schema:
        
        Schema Analysis: {json.dumps(schema_analysis, indent=2)}
        
        Requirements:
        1. Follow the detected patterns and relationships
        2. Generate realistic values for each column type
        3. Maintain statistical properties
        4. Return as valid JSON array of objects
        
        Generate exactly {batch_size} rows.
        """
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": generation_prompt}],
                temperature=0.7,
                max_tokens=4000
            )
            
            generated_json = json.loads(response.choices[0].message.content)
            return pd.DataFrame(generated_json)
            
        except Exception as e:
            logger.warning(f"OpenAI batch generation failed: {e}")
            return None
    
    def _get_user_model_access(self, user: User) -> Dict[str, bool]:
        """Determine what models the user has access to based on their tier"""
        
        tier = user.subscription_tier
        
        access = {
            "claude_sonnet": True,  # All tiers
            "claude_opus": tier in [SubscriptionTier.ENTERPRISE],
            "gpt_4_turbo": tier in [SubscriptionTier.GROWTH, SubscriptionTier.ENTERPRISE],
            "gpt_3_5_turbo": tier in [SubscriptionTier.PROFESSIONAL, SubscriptionTier.GROWTH, SubscriptionTier.ENTERPRISE],
            "custom_models": tier in [SubscriptionTier.GROWTH, SubscriptionTier.ENTERPRISE],
            "multi_model_generation": tier in [SubscriptionTier.PROFESSIONAL, SubscriptionTier.GROWTH, SubscriptionTier.ENTERPRISE],
            "ensemble_generation": tier in [SubscriptionTier.ENTERPRISE],
            "premium_features": tier in [SubscriptionTier.PROFESSIONAL, SubscriptionTier.GROWTH, SubscriptionTier.ENTERPRISE]
        }
        
        return access
    
    async def _get_user_custom_models(self, user: User, dataset: Dataset) -> List[Dict[str, Any]]:
        """Get user's custom models that are compatible with the dataset"""
        
        # This would query the database for user's custom models
        # For now, return empty list
        return []
    
    # Additional helper methods would be implemented here...
    async def _detect_industry_domain(self, dataset: Dataset) -> IndustryDomain:
        """Detect industry domain from dataset characteristics"""
        # Reuse logic from enhanced realism engine
        return IndustryDomain.GENERAL
    
    async def _assess_dataset_complexity(self, dataset: Dataset) -> str:
        """Assess complexity of the dataset"""
        # Simple complexity assessment
        if len(dataset.columns) > 20:
            return "high"
        elif len(dataset.columns) > 10:
            return "medium"
        else:
            return "low" 