"""
Claude AI Agent for Synthetic Data Generation
Advanced synthetic data generation using Anthropic's Claude API with cutting-edge AI capabilities
"""

import json
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple, AsyncGenerator, Union
from datetime import datetime, timedelta
import asyncio
import logging
from dataclasses import dataclass, asdict
from enum import Enum
import anthropic
from anthropic import Anthropic, AsyncAnthropic
import hashlib
import pickle
from pathlib import Path
import aiofiles
import time
import os

from app.core.config import settings
from app.core.logging import get_logger
from app.models.dataset import Dataset, DatasetColumn, GenerationJob
from app.services.privacy_engine import PrivacyEngine
from app.core.redis import get_redis_client

# Import enhanced realism engine
from app.agents.enhanced_realism_engine import EnhancedRealismEngine, RealismConfig, IndustryDomain

import numpy as np
from scipy.stats import ks_2samp, chi2_contingency
from collections import defaultdict

logger = get_logger(__name__)


class ModelType(Enum):
    """Supported AI models"""
    CLAUDE_3_SONNET = "claude-3-sonnet-20240229"
    CLAUDE_3_OPUS = "claude-3-opus-20240229"
    CLAUDE_3_HAIKU = "claude-3-haiku-20240307"
    CLAUDE_2 = "claude-2.1"


class GenerationStrategy(Enum):
    """Data generation strategies"""
    STATISTICAL = "statistical"
    AI_CREATIVE = "ai_creative"  
    HYBRID = "hybrid"
    PATTERN_BASED = "pattern_based"
    CONSTRAINT_DRIVEN = "constraint_driven"


@dataclass
class GenerationConfig:
    """Enhanced configuration for synthetic data generation"""
    rows: int
    privacy_level: str
    epsilon: float
    delta: float
    model_type: ModelType = ModelType.CLAUDE_3_SONNET
    strategy: GenerationStrategy = GenerationStrategy.HYBRID
    maintain_correlations: bool = True
    preserve_distributions: bool = True
    add_noise: bool = True
    quality_threshold: float = 0.8
    batch_size: int = 1000
    max_retries: int = 3
    enable_streaming: bool = True
    cache_strategy: bool = True
    temperature: float = 0.7
    max_tokens: int = 4000
    custom_constraints: Optional[Dict[str, Any]] = None
    semantic_coherence: bool = True
    business_rules: Optional[List[str]] = None


@dataclass
class QualityMetrics:
    """Comprehensive quality assessment metrics"""
    overall_quality: float
    statistical_similarity: float
    distribution_fidelity: float
    correlation_preservation: float
    privacy_protection: float
    semantic_coherence: float
    constraint_compliance: float
    execution_time: float
    memory_usage: float
    details: Dict[str, Any]


class AdvancedClaudeAgent:
    """
    Advanced Claude AI agent with enhanced realism capabilities
    for critical industry applications
    """
    
    def __init__(self):
        self.sync_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.async_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.privacy_engine = PrivacyEngine()
        self.cache = {}
        self.model_registry = {
            ModelType.CLAUDE_3_SONNET: {"context": 200000, "output": 4096},
            ModelType.CLAUDE_3_OPUS: {"context": 200000, "output": 4096}, 
            ModelType.CLAUDE_3_HAIKU: {"context": 200000, "output": 4096},
            ModelType.CLAUDE_2: {"context": 100000, "output": 4096}
        }
        self.realism_engine = EnhancedRealismEngine()
        # === Advanced optimization and analytics ===
        self.prompt_optimizer = PromptOptimizer()
        self.response_processor = ClaudeResponseProcessor()
        self.context_manager = ContextManager()
        self.adaptive_learning = AdaptiveLearning()
        self.analytics = GenerationAnalytics()
    
    async def health_check(self) -> bool:
        """Enhanced health check for AI service"""
        try:
            response = await self.async_client.messages.create(
                model=ModelType.CLAUDE_3_HAIKU.value,
                max_tokens=10,
                messages=[{"role": "user", "content": "ping"}]
            )
            return bool(response.content)
        except Exception as e:
            logger.error("AI service health check failed", error=str(e))
            return False
    
    async def generate_synthetic_data(
        self,
        dataset: Dataset,
        config: GenerationConfig,
        job: GenerationJob
    ) -> Tuple[pd.DataFrame, QualityMetrics]:
        """
        Advanced synthetic data generation with real-time streaming and quality assessment
        """
        start_time = time.time()
        memory_usage = self._get_memory_usage()
        try:
            logger.info(
                "Starting advanced synthetic data generation",
                dataset_id=dataset.id,
                rows=config.rows,
                strategy=config.strategy.value,
                model=config.model_type.value,
                enable_streaming=config.enable_streaming
            )
            # --- Prompt Optimization ---
            schema = getattr(dataset, 'columns', None)
            sample_data = getattr(dataset, 'sample_data', None)
            privacy_level = getattr(config, 'privacy_level', 'medium')
            # Build context-aware prompt (future: use in _advanced_schema_analysis)
            self.prompt_optimizer.build_context_aware_prompt(schema, sample_data, privacy_level)
            # --- Smart Chunking (future: use for large datasets) ---
            self.context_manager.chunk_intelligently(dataset)
            # Step 1: Intelligent schema analysis with AI reasoning
            schema_analysis = await self._advanced_schema_analysis(dataset, config)
            await job.update_progress(10.0, "Schema analysis complete")
            # Step 2: Pattern detection using multiple AI perspectives
            patterns = await self._multi_perspective_pattern_detection(dataset, config)
            await job.update_progress(20.0, "Pattern detection complete")
            # Step 3: Strategic generation planning
            generation_plan = await self._create_intelligent_generation_plan(
                schema_analysis, patterns, config
            )
            await job.update_progress(30.0, "Generation strategy planned")
            # Step 4: Multi-batch generation with streaming
            if config.enable_streaming:
                synthetic_data = await self._stream_generation_batches(
                    generation_plan, config, job
                )
            else:
                synthetic_data = await self._batch_generation_standard(
                    generation_plan, config, job
                )
            await job.update_progress(70.0, "Data generation complete")
            # --- Multi-stage Validation and Enhancement ---
            self.response_processor.validate_statistical_properties(dataset, synthetic_data)
            synthetic_data = self.response_processor.repair_data_quality(synthetic_data)
            # Step 5: Advanced privacy protection
            if config.add_noise:
                synthetic_data = await self._apply_advanced_privacy_protection(
                    synthetic_data, config, schema_analysis
                )
            await job.update_progress(80.0, "Privacy protection applied")
            # Step 6: Comprehensive quality assessment
            quality_metrics = await self._comprehensive_quality_assessment(
                dataset, synthetic_data, config, start_time, memory_usage
            )
            await job.update_progress(90.0, "Quality assessment complete")
            # Step 7: Enhanced realism processing for critical industry accuracy
            synthetic_data, realism_metrics = await self._apply_enhanced_realism_processing(
                synthetic_data, dataset, config, schema_analysis
            )
            await job.update_progress(95.0, "Enhanced realism processing complete")
            # Step 8: Add enterprise watermarks and metadata
            if settings.ENABLE_WATERMARKS:
                synthetic_data = await self._add_intelligent_watermarks(
                    synthetic_data, dataset, config
                )
            await job.update_progress(100.0, "Generation complete")
            # --- Analytics and Adaptive Learning ---
            self.analytics.track_claude_performance()
            self.adaptive_learning.learn_from_user_feedback(job.id, getattr(quality_metrics, 'overall_quality', None))
            # Cache results for future optimizations
            if config.cache_strategy:
                await self._cache_generation_results(
                    dataset, config, synthetic_data, quality_metrics
                )
            logger.info(
                "Advanced synthetic data generation completed",
                dataset_id=dataset.id,
                synthetic_rows=len(synthetic_data),
                quality_score=quality_metrics.overall_quality,
                execution_time=quality_metrics.execution_time,
                strategy=config.strategy.value
            )
            return synthetic_data, quality_metrics
        except Exception as e:
            logger.error(
                "Advanced synthetic data generation failed",
                dataset_id=dataset.id,
                error=str(e),
                config=asdict(config),
                exc_info=True
            )
            raise
    
    async def _advanced_schema_analysis(
        self, 
        dataset: Dataset, 
        config: GenerationConfig
    ) -> Dict[str, Any]:
        """AI-powered schema analysis with deep understanding and few-shot examples"""
        
        cache_key = f"schema_analysis_{dataset.id}_{hash(str(dataset.columns))}"
        if config.cache_strategy and (cached := await self._get_cache(cache_key)):
            return cached
        
        # Prepare comprehensive schema context
        schema_context = {
            "dataset_info": {
                "name": dataset.name,
                "description": dataset.description,
                "row_count": dataset.row_count,
                "column_count": len(dataset.columns),
                "domain": dataset.domain or "general",
                "creation_date": dataset.created_at.isoformat()
            },
            "columns": [
                {
                    "name": col.name,
                    "type": col.data_type.value,
                    "unique_values": col.unique_values,
                    "null_count": col.null_count,
                    "null_percentage": (col.null_count / dataset.row_count) * 100,
                    "sample_values": col.get_sample_values()[:10],
                    "privacy_category": col.privacy_category,
                    "constraints": col.constraints or {},
                    "business_meaning": col.business_meaning or "unknown"
                }
                for col in dataset.columns
            ]
        }
        # Add few-shot examples
        pattern_samples = await self._prepare_pattern_analysis_samples(dataset)
        few_shot_examples = pattern_samples.get("sample_rows", [])
        
        analysis_prompt = f"""
        As an expert data scientist and synthetic data generation specialist, analyze this dataset schema for optimal synthetic data generation.
        
        Dataset Context: {json.dumps(schema_context, indent=2)}
        
        Few-Shot Examples (real data rows):
        {json.dumps(few_shot_examples, indent=2)}
        
        Generation Requirements:
        - Target rows: {config.rows:,}
        - Privacy level: {config.privacy_level}
        - Strategy: {config.strategy.value}
        - Quality threshold: {config.quality_threshold}
        - Maintain correlations: {config.maintain_correlations}
        - Preserve distributions: {config.preserve_distributions}
        - Add noise: {config.add_noise}
        - Semantic coherence: {config.semantic_coherence}
        - Business rules: {config.business_rules}
        - Custom constraints: {config.custom_constraints}
        
        Provide a comprehensive analysis including:
        1. Data Types & Distributions: Detailed analysis of each column's characteristics and how to mimic them
        2. Relationships: Inter-column dependencies and correlations, with explicit mapping
        3. Business Logic: Inferred business rules and constraints, with examples
        4. Privacy Implications: Sensitive data identification and protection needs
        5. Generation Complexity: Difficulty assessment for each column
        6. Optimization Opportunities: Strategies for efficient, high-quality generation
        7. Quality Metrics: Specific quality measures for this dataset
        8. Risk Assessment: Potential issues and mitigation strategies
        
        Return as structured JSON with actionable insights for synthetic data generation.
        """
        
        try:
            response = await self._call_claude_advanced(
                analysis_prompt, config.model_type, temperature=0.3
            )
            analysis = json.loads(response)
            analysis["statistical_insights"] = await self._statistical_enhancement(dataset)
            if config.cache_strategy:
                await self._set_cache(cache_key, analysis, ttl=3600)
            return analysis
        except json.JSONDecodeError as e:
            logger.warning(
                "Claude response parsing failed, using enhanced fallback", 
                error=str(e)
            )
            return await self._enhanced_fallback_schema_analysis(dataset, config)
    
    async def _multi_perspective_pattern_detection(
        self, 
        dataset: Dataset, 
        config: GenerationConfig
    ) -> Dict[str, Any]:
        """Multi-perspective pattern analysis using different AI reasoning approaches"""
        
        cache_key = f"patterns_{dataset.id}_{config.strategy.value}"
        if config.cache_strategy and (cached := await self._get_cache(cache_key)):
            return cached
        
        # Prepare data samples for pattern analysis
        data_samples = await self._prepare_pattern_analysis_samples(dataset)
        
        # Multiple analysis perspectives
        perspectives = [
            ("statistical", "Focus on statistical patterns, distributions, and correlations"),
            ("business", "Analyze from business logic and domain knowledge perspective"),
            ("temporal", "Identify time-based patterns and sequences"),
            ("categorical", "Examine categorical relationships and hierarchies"),
            ("anomaly", "Detect outliers and unusual patterns that should be preserved")
        ]
        
        pattern_results = {}
        
        for perspective_name, perspective_instruction in perspectives:
            pattern_prompt = f"""
            {perspective_instruction}
            
            Dataset: {dataset.name}
            Data Samples: {json.dumps(data_samples, indent=2)}
            
            Analyze patterns from this {perspective_name} perspective:
            
            1. Key patterns identified
            2. Strength and importance of each pattern
            3. Interdependencies with other columns
            4. Generation implications
            5. Preservation strategies
            
            Return structured JSON with specific, actionable pattern insights.
            """
            
            try:
                response = await self._call_claude_advanced(
                    pattern_prompt, config.model_type, temperature=0.5
                )
                pattern_results[perspective_name] = json.loads(response)
                
            except Exception as e:
                logger.warning(
                    f"Pattern analysis failed for {perspective_name} perspective",
                    error=str(e)
                )
                pattern_results[perspective_name] = {"error": str(e)}
        
        # Synthesize multi-perspective insights
        synthesis_prompt = f"""
        Synthesize these multi-perspective pattern analyses into unified insights:
        
        {json.dumps(pattern_results, indent=2)}
        
        Create a comprehensive pattern profile that prioritizes:
        1. Most critical patterns to preserve
        2. Generation strategy recommendations
        3. Quality validation approaches
        4. Risk mitigation strategies
        
        Return as structured JSON.
        """
        
        try:
            synthesis_response = await self._call_claude_advanced(
                synthesis_prompt, config.model_type, temperature=0.4
            )
            final_patterns = json.loads(synthesis_response)
            final_patterns["raw_perspectives"] = pattern_results
            
            if config.cache_strategy:
                await self._set_cache(cache_key, final_patterns, ttl=1800)
            
            return final_patterns
            
        except Exception as e:
            logger.error("Pattern synthesis failed", error=str(e))
            return {"perspectives": pattern_results, "synthesis_error": str(e)}
    
    async def _create_intelligent_generation_plan(
        self,
        schema_analysis: Dict[str, Any],
        patterns: Dict[str, Any],
        config: GenerationConfig
    ) -> Dict[str, Any]:
        """Create intelligent generation plan using AI strategic planning"""
        
        planning_prompt = f"""
        As an AI architect, create an optimal synthetic data generation plan:
        
        Schema Analysis: {json.dumps(schema_analysis, indent=2)}
        Pattern Analysis: {json.dumps(patterns, indent=2)}
        
        Generation Configuration:
        - Rows: {config.rows:,}
        - Strategy: {config.strategy.value}
        - Model: {config.model_type.value}
        - Quality threshold: {config.quality_threshold}
        - Batch size: {config.batch_size}
        - Custom constraints: {config.custom_constraints}
        
        Create a detailed generation plan including:
        
        1. **Column Generation Order**: Optimal sequence based on dependencies
        2. **Batch Strategy**: How to efficiently process {config.rows:,} rows
        3. **Quality Checkpoints**: Validation points during generation
        4. **Resource Optimization**: Memory and computation efficiency
        5. **Error Handling**: Fallback strategies for each step
        6. **Progressive Enhancement**: How to improve quality iteratively
        
        Return as executable JSON plan.
        """
        
        try:
            response = await self._call_claude_advanced(
                planning_prompt, config.model_type, temperature=0.3
            )
            plan = json.loads(response)
            
            # Enhance plan with runtime optimizations
            plan["runtime_config"] = {
                "batch_size": min(config.batch_size, max(100, config.rows // 10)),
                "parallel_workers": min(4, max(1, config.rows // 5000)),
                "memory_limit": "2GB",
                "timeout_per_batch": 300,
                "retry_strategy": "exponential_backoff"
            }
            
            return plan
            
        except Exception as e:
            logger.warning("AI planning failed, using optimized fallback", error=str(e))
            return await self._fallback_generation_plan(schema_analysis, config)
    
    async def _stream_generation_batches(
        self,
        generation_plan: Dict[str, Any],
        config: GenerationConfig,
        job: GenerationJob
    ) -> pd.DataFrame:
        """Real-time streaming generation with live progress updates"""
        
        total_batches = (config.rows + config.batch_size - 1) // config.batch_size
        generated_data = []
        
        async def generate_batch_stream(batch_idx: int) -> pd.DataFrame:
            batch_size = min(
                config.batch_size, 
                config.rows - (batch_idx * config.batch_size)
            )
            
            batch_data = await self._generate_intelligent_batch(
                generation_plan, batch_size, batch_idx, config
            )
            
            # Update progress in real-time
            progress = 30.0 + (batch_idx + 1) / total_batches * 40.0
            await job.update_progress(
                progress, 
                f"Generated batch {batch_idx + 1}/{total_batches}"
            )
            
            return batch_data
        
        # Generate batches with concurrency control
        semaphore = asyncio.Semaphore(generation_plan["runtime_config"]["parallel_workers"])
        
        async def controlled_batch_generation(batch_idx: int):
            async with semaphore:
                return await generate_batch_stream(batch_idx)
        
        # Execute batch generation
        batch_tasks = [
            controlled_batch_generation(i) for i in range(total_batches)
        ]
        
        for batch_future in asyncio.as_completed(batch_tasks):
            batch_data = await batch_future
            generated_data.append(batch_data)
        
        # Combine all batches
        final_data = pd.concat(generated_data, ignore_index=True)
        return final_data.head(config.rows)  # Ensure exact row count
    
    async def _generate_intelligent_batch(
        self,
        plan: Dict[str, Any],
        batch_size: int,
        batch_idx: int,
        config: GenerationConfig
    ) -> pd.DataFrame:
        """Generate a single batch using intelligent AI reasoning with few-shot and chain prompting"""
        # Prepare few-shot examples for this batch
        few_shot_examples = plan.get("few_shot_examples")
        if not few_shot_examples and hasattr(self, "_prepare_pattern_analysis_samples"):
            # Fallback: try to get from dataset if not in plan
            dataset = plan.get("dataset")
            if dataset:
                pattern_samples = await self._prepare_pattern_analysis_samples(dataset)
                few_shot_examples = pattern_samples.get("sample_rows", [])
        batch_prompt = f"""
        Generate {batch_size} rows of synthetic data following this intelligent plan and using the provided few-shot examples for guidance.
        
        Generation Plan: {json.dumps(plan, indent=2)}
        Batch Index: {batch_idx}
        
        Few-Shot Examples (real data rows):
        {json.dumps(few_shot_examples, indent=2)}
        
        Requirements:
        1. Follow the column generation order from the plan
        2. Maintain all specified relationships and constraints
        3. Ensure data quality meets threshold: {config.quality_threshold}
        4. Apply business rules and logic consistently, as shown in the examples
        5. Generate realistic, coherent data that matches the patterns in the few-shot examples
        6. Return ONLY a valid JSON array of {batch_size} data objects. Each object should have all required columns with appropriate values.
        """
        for attempt in range(config.max_retries):
            try:
                response = await self._call_claude_advanced(
                    batch_prompt, 
                    config.model_type, 
                    temperature=config.temperature,
                    max_tokens=min(config.max_tokens, batch_size * 50)
                )
                batch_data = json.loads(response)
                df = pd.DataFrame(batch_data)
                if await self._validate_batch_quality(df, plan, config):
                    return df
                else:
                    logger.warning(f"Batch {batch_idx} quality below threshold, retrying...")
            except Exception as e:
                logger.warning(
                    f"Batch generation attempt {attempt + 1} failed", 
                    batch_idx=batch_idx,
                    error=str(e)
                )
                if attempt == config.max_retries - 1:
                    logger.info(f"Using fallback generation for batch {batch_idx}")
                    return await self._fallback_batch_generation(plan, batch_size, config)
        return await self._fallback_batch_generation(plan, batch_size, config)
    
    async def _comprehensive_quality_assessment(
        self,
        original_dataset: Dataset,
        synthetic_data: pd.DataFrame,
        config: GenerationConfig,
        start_time: float,
        initial_memory: float
    ) -> QualityMetrics:
        """Comprehensive quality assessment using multiple AI and statistical approaches"""
        
        execution_time = time.time() - start_time
        current_memory = self._get_memory_usage()
        memory_usage = current_memory - initial_memory
        
        # Multi-dimensional quality assessment
        quality_tasks = [
            self._assess_statistical_similarity(original_dataset, synthetic_data),
            self._assess_distribution_fidelity(original_dataset, synthetic_data),
            self._assess_correlation_preservation(original_dataset, synthetic_data),
            self._assess_privacy_protection(synthetic_data, config),
            self._assess_semantic_coherence(synthetic_data, config),
            self._assess_constraint_compliance(synthetic_data, config)
        ]
        
        quality_results = await asyncio.gather(*quality_tasks, return_exceptions=True)
        
        # Calculate composite scores
        statistical_similarity = quality_results[0] if not isinstance(quality_results[0], Exception) else 0.0
        distribution_fidelity = quality_results[1] if not isinstance(quality_results[1], Exception) else 0.0
        correlation_preservation = quality_results[2] if not isinstance(quality_results[2], Exception) else 0.0
        privacy_protection = quality_results[3] if not isinstance(quality_results[3], Exception) else 0.0
        semantic_coherence = quality_results[4] if not isinstance(quality_results[4], Exception) else 0.0
        constraint_compliance = quality_results[5] if not isinstance(quality_results[5], Exception) else 0.0
        
        # Weighted overall quality score
        weights = {
            "statistical": 0.25,
            "distribution": 0.20,
            "correlation": 0.20,
            "privacy": 0.15,
            "semantic": 0.10,
            "constraints": 0.10
        }
        
        overall_quality = (
            statistical_similarity * weights["statistical"] +
            distribution_fidelity * weights["distribution"] +
            correlation_preservation * weights["correlation"] +
            privacy_protection * weights["privacy"] +
            semantic_coherence * weights["semantic"] +
            constraint_compliance * weights["constraints"]
        )
        
        return QualityMetrics(
            overall_quality=overall_quality,
            statistical_similarity=statistical_similarity,
            distribution_fidelity=distribution_fidelity,
            correlation_preservation=correlation_preservation,
            privacy_protection=privacy_protection,
            semantic_coherence=semantic_coherence,
            constraint_compliance=constraint_compliance,
            execution_time=execution_time,
            memory_usage=memory_usage,
            details={
                "batch_count": len(synthetic_data) // config.batch_size + 1,
                "generation_strategy": config.strategy.value,
                "model_used": config.model_type.value,
                "privacy_level": config.privacy_level,
                "rows_generated": len(synthetic_data),
                "columns_generated": len(synthetic_data.columns),
                "exceptions": [str(e) for e in quality_results if isinstance(e, Exception)]
            }
        )
    
    async def _apply_enhanced_realism_processing(
        self,
        synthetic_data: pd.DataFrame,
        dataset: Dataset,
        config: GenerationConfig,
        schema_analysis: Dict[str, Any]
    ) -> Tuple[pd.DataFrame, Dict[str, float]]:
        """
        Apply enhanced realism processing for critical industry accuracy
        """
        logger.info("Applying enhanced realism processing for maximum accuracy")
        
        # Determine industry domain from dataset metadata
        industry_domain = self._detect_industry_domain(dataset, schema_analysis)
        
        # Configure realism settings
        realism_config = RealismConfig(
            industry_domain=industry_domain,
            enforce_business_rules=True,
            validate_domain_constraints=True,
            preserve_temporal_patterns=True,
            maintain_semantic_consistency=True,
            use_domain_ontologies=True,
            apply_regulatory_compliance=True,
            cross_field_validation=True,
            statistical_accuracy_threshold=0.98,  # Ultra-high accuracy for critical industries
            correlation_preservation_threshold=0.95
        )
        
        # Load original data for pattern analysis
        original_data = await self._load_original_dataset_sample(dataset)
        
        # Apply enhanced realism
        enhanced_data, realism_metrics = await self.realism_engine.enhance_synthetic_data(
            synthetic_data=synthetic_data,
            original_data=original_data,
            config=realism_config,
            schema_analysis=schema_analysis
        )
        
        logger.info(
            "Enhanced realism processing complete",
            industry_domain=industry_domain.value,
            overall_realism_score=realism_metrics.get('overall_realism', 0.0),
            domain_compliance=realism_metrics.get('domain_compliance', 0.0),
            business_rule_adherence=realism_metrics.get('business_rule_adherence', 0.0)
        )
        
        return enhanced_data, realism_metrics
    
    def _detect_industry_domain(self, dataset: Dataset, schema_analysis: Dict[str, Any]) -> IndustryDomain:
        """
        Automatically detect industry domain from dataset characteristics
        """
        domain_indicators = {
            IndustryDomain.HEALTHCARE: [
                'patient', 'medical', 'diagnosis', 'icd', 'blood_pressure', 'heart_rate',
                'medication', 'doctor', 'hospital', 'treatment', 'symptom', 'vital',
                'temperature', 'weight', 'height', 'bmi', 'allergy'
            ],
            IndustryDomain.FINANCE: [
                'account', 'balance', 'transaction', 'credit', 'loan', 'payment',
                'interest', 'income', 'debt', 'mortgage', 'investment', 'portfolio',
                'risk', 'return', 'equity', 'bond', 'currency', 'exchange'
            ],
            IndustryDomain.MANUFACTURING: [
                'production', 'quality', 'defect', 'batch', 'serial', 'machine',
                'temperature', 'pressure', 'speed', 'efficiency', 'yield',
                'maintenance', 'downtime', 'throughput', 'cycle_time'
            ],
            IndustryDomain.ENERGY: [
                'power', 'voltage', 'current', 'grid', 'consumption', 'generation',
                'renewable', 'solar', 'wind', 'turbine', 'meter', 'load'
            ],
            IndustryDomain.AUTOMOTIVE: [
                'vehicle', 'engine', 'transmission', 'fuel', 'emission', 'brake',
                'tire', 'suspension', 'electronic', 'diagnostic', 'mileage'
            ],
            IndustryDomain.RETAIL: [
                'product', 'inventory', 'sales', 'customer', 'purchase', 'order',
                'shipment', 'return', 'discount', 'promotion', 'category', 'brand'
            ]
        }
        
        # Analyze column names and descriptions
        text_to_analyze = []
        text_to_analyze.extend([col.lower() for col in dataset.columns if hasattr(dataset, 'columns')])
        
        if dataset.description:
            text_to_analyze.append(dataset.description.lower())
        if dataset.name:
            text_to_analyze.append(dataset.name.lower())
        
        # Extract column information from schema analysis
        if 'columns' in schema_analysis:
            for col_info in schema_analysis['columns']:
                if 'name' in col_info:
                    text_to_analyze.append(col_info['name'].lower())
                if 'business_meaning' in col_info and col_info['business_meaning']:
                    text_to_analyze.append(col_info['business_meaning'].lower())
        
        combined_text = ' '.join(text_to_analyze)
        
        # Score each domain
        domain_scores = {}
        for domain, indicators in domain_indicators.items():
            score = sum(1 for indicator in indicators if indicator in combined_text)
            domain_scores[domain] = score
        
        # Return domain with highest score, default to GENERAL
        if domain_scores:
            detected_domain = max(domain_scores, key=domain_scores.get)
            if domain_scores[detected_domain] > 0:
                logger.info(f"Detected industry domain: {detected_domain.value}")
                return detected_domain
        
        logger.info("Using general domain (no specific industry detected)")
        return IndustryDomain.GENERAL
    
    async def _load_original_dataset_sample(self, dataset: Dataset) -> pd.DataFrame:
        """
        Load a sample of the original dataset for pattern analysis
        """
        try:
            # This would load actual dataset data from S3 or database
            # For now, return empty DataFrame as placeholder
            logger.info(f"Loading original dataset sample for pattern analysis: {dataset.id}")
            
            # In real implementation, this would:
            # 1. Load dataset from S3 using dataset.file_path
            # 2. Return a representative sample for analysis
            # 3. Handle different file formats (CSV, JSON, Excel, etc.)
            
            return pd.DataFrame()  # Placeholder
            
        except Exception as e:
            logger.warning(f"Could not load original dataset sample: {e}")
            return pd.DataFrame()
    
    async def _post_process_data(
        self,
        synthetic_data: pd.DataFrame,
        config: GenerationConfig,
        schema_analysis: Dict[str, Any]
    ) -> pd.DataFrame:
        """
        Post-processing and validation of generated data
        """
        logger.info("Starting post-processing and validation")
        
        # Apply enhanced realism processing
        synthetic_data, realism_metrics = await self._apply_enhanced_realism_processing(
            synthetic_data, dataset, config, schema_analysis
        )
        
        # Apply business rules and constraints
        if config.business_rules:
            synthetic_data = self._apply_business_rules(synthetic_data, config.business_rules)
        
        # Add enterprise watermarks and metadata
        if settings.ENABLE_WATERMARKS:
            synthetic_data = await self._add_intelligent_watermarks(
                synthetic_data, dataset, config
            )
        
        logger.info("Post-processing and validation complete")
        return synthetic_data
    
    def _apply_business_rules(self, data: pd.DataFrame, rules: List[str]) -> pd.DataFrame:
        """
        Applies a list of business rules to the generated data.
        This is a placeholder and would require a more sophisticated rule engine.
        """
        logger.info(f"Applying {len(rules)} business rules")
        for rule in rules:
            logger.debug(f"Applying rule: {rule}")
            # Example: Ensure 'age' is between 0 and 100
            if 'age' in data.columns and 'birth_date' in data.columns:
                data['age'] = data['birth_date'].apply(lambda x: int((datetime.now() - x).days / 365.25))
            # Add more rules here as needed
        return data
    
    async def _add_intelligent_watermarks(
        self,
        synthetic_data: pd.DataFrame,
        dataset: Dataset,
        config: GenerationConfig
    ) -> pd.DataFrame:
        """
        Adds intelligent watermarks and metadata to the generated data.
        This is a placeholder and would require a more sophisticated watermarking engine.
        """
        logger.info("Adding intelligent watermarks and metadata")
        
        # Example: Add a watermark column
        synthetic_data['synthetic_source'] = 'Claude AI'
        synthetic_data['generation_date'] = datetime.now().isoformat()
        synthetic_data['dataset_id'] = dataset.id
        synthetic_data['generation_job_id'] = job.id
        
        # Add more watermarks as needed
        logger.info("Watermarks and metadata added")
        return synthetic_data
    
    async def _cache_generation_results(
        self,
        dataset: Dataset,
        config: GenerationConfig,
        synthetic_data: pd.DataFrame,
        quality_metrics: QualityMetrics
    ):
        """
        Caches the results of a synthetic data generation job.
        """
        cache_key = f"synthetic_data_{dataset.id}_{config.rows}_{config.privacy_level}_{config.strategy.value}_{config.model_type.value}"
        cache_value = {
            "synthetic_data": synthetic_data.to_dict(orient="records"),
            "quality_metrics": asdict(quality_metrics),
            "generation_config": asdict(config),
            "dataset_id": dataset.id,
            "generation_job_id": job.id,
            "generation_date": datetime.now().isoformat()
        }
        await self._set_cache(cache_key, cache_value, ttl=3600) # Cache for 1 hour
    
    async def _get_cache(self, key: str) -> Optional[Any]:
        """
        Retrieves an item from the cache.
        """
        if settings.REDIS_ENABLED:
            redis_client = get_redis_client()
            if redis_client:
                cached_data = await redis_client.get(key)
                if cached_data:
                    return pickle.loads(cached_data)
        return None
    
    async def _set_cache(self, key: str, value: Any, ttl: int):
        """
        Sets an item in the cache.
        """
        if settings.REDIS_ENABLED:
            redis_client = get_redis_client()
            if redis_client:
                await redis_client.set(key, pickle.dumps(value), ex=ttl)
        else:
            # In-memory caching for development
            self.cache[key] = value
    
    def _get_memory_usage(self) -> float:
        """
        Gets the current memory usage of the process.
        """
        try:
            import psutil
            process = psutil.Process(os.getpid())
            return process.memory_info().rss / 1024 / 1024 # MB
        except ImportError:
            logger.warning("psutil not installed, memory usage tracking disabled.")
            return 0.0
        except Exception as e:
            logger.error("Error getting memory usage", error=str(e))
            return 0.0
    
    async def _call_claude_advanced(
        self,
        prompt: str,
        model_type: ModelType,
        temperature: float = 0.7,
        max_tokens: int = 4000
    ) -> str:
        """
        Calls Claude API with advanced configuration.
        """
        try:
            if settings.ANTHROPIC_API_KEY:
                if settings.ANTHROPIC_API_KEY.startswith("sk-"):
                    # Use async_client for Anthropic API key starting with "sk-"
                    response = await self.async_client.messages.create(
                        model=model_type.value,
                        max_tokens=max_tokens,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=temperature,
                        stream=False
                    )
                else:
                    # Use sync_client for other API keys
                    response = self.sync_client.messages.create(
                        model=model_type.value,
                        max_tokens=max_tokens,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=temperature,
                        stream=False
                    )
                return response.content
            else:
                raise ValueError("Anthropic API key not configured.")
        except Exception as e:
            logger.error("Claude API call failed", error=str(e))
            raise
    
    async def _validate_batch_quality(
        self,
        batch_data: pd.DataFrame,
        generation_plan: Dict[str, Any],
        config: GenerationConfig
    ) -> bool:
        """
        Validates the quality of a generated batch against the plan.
        """
        # This is a placeholder. In a real system, you would:
        # 1. Check for missing columns
        # 2. Validate data types
        # 3. Ensure all constraints are met
        # 4. Check for anomalies or outliers
        # 5. Compare with original data patterns
        
        # Example: Check if all required columns are present
        required_cols = set(generation_plan.get("column_generation_order", []))
        if not required_cols.issubset(set(batch_data.columns)):
            logger.warning("Generated batch missing required columns.")
            return False
        
        # Example: Check for data type consistency
        for col_name, col_type in generation_plan["column_types"].items():
            if col_name in batch_data.columns:
                if not pd.api.types.is_type_convertible(batch_data[col_name].dtype, col_type):
                    logger.warning(f"Data type mismatch for column {col_name}.")
                    return False
        
        # Example: Check for constraints
        if config.custom_constraints:
            for constraint_name, constraint_details in config.custom_constraints.items():
                if constraint_name in batch_data.columns:
                    if "min_value" in constraint_details:
                        if not (batch_data[constraint_name] >= constraint_details["min_value"]).all():
                            logger.warning(f"Constraint {constraint_name} min_value failed.")
                            return False
                    if "max_value" in constraint_details:
                        if not (batch_data[constraint_name] <= constraint_details["max_value"]).all():
                            logger.warning(f"Constraint {constraint_name} max_value failed.")
                            return False
                    if "unique" in constraint_details:
                        if not (batch_data[constraint_name].nunique() == len(batch_data[constraint_name])):
                            logger.warning(f"Constraint {constraint_name} unique failed.")
                            return False
        
        # Example: Check for anomalies or outliers
        if config.add_noise:
            # This is a simplified check. A real system would use statistical tests
            # and domain-specific anomaly detection.
            if "age" in batch_data.columns and "birth_date" in batch_data.columns:
                age_from_birth = (datetime.now() - pd.to_datetime(batch_data["birth_date"])).dt.days / 365.25
                if (age_from_birth < 0).any():
                    logger.warning("Negative age detected in generated data.")
                    return False
        
        return True
    
    async def _fallback_batch_generation(
        self,
        generation_plan: Dict[str, Any],
        batch_size: int,
        config: GenerationConfig
    ) -> pd.DataFrame:
        """
        Fallback generation strategy if the main AI generation fails.
        """
        logger.warning("Using fallback generation due to AI failure.")
        
        # This fallback would involve statistical generation or a simpler AI approach
        # For now, we'll just return an empty DataFrame or raise an error.
        # A more robust fallback would involve a statistical model or a simpler AI.
        
        # Example: Simple statistical generation (very basic)
        # This is a placeholder and would require a proper statistical model.
        # For demonstration, we'll return a DataFrame with random data.
        
        # Generate a dummy DataFrame with random data
        dummy_data = []
        for i in range(batch_size):
            row = {}
            for col_name in generation_plan["column_generation_order"]:
                if col_name in generation_plan["column_types"]:
                    if generation_plan["column_types"][col_name] == "integer":
                        row[col_name] = np.random.randint(1, 100)
                    elif generation_plan["column_types"][col_name] == "float":
                        row[col_name] = np.random.uniform(0.0, 100.0)
                    elif generation_plan["column_types"][col_name] == "string":
                        row[col_name] = "dummy_string_" + str(i)
                    elif generation_plan["column_types"][col_name] == "date":
                        row[col_name] = datetime.now() - timedelta(days=np.random.randint(1, 365))
                    elif generation_plan["column_types"][col_name] == "boolean":
                        row[col_name] = np.random.choice([True, False])
                    else:
                        row[col_name] = "unknown_type"
                else:
                    row[col_name] = "no_type_info"
            dummy_data.append(row)
        
        return pd.DataFrame(dummy_data)
    
    async def _statistical_enhancement(self, dataset: Dataset) -> Dict[str, Any]:
        """
        Provides statistical insights for the dataset.
        """
        insights = {}
        for col in dataset.columns:
            if col.data_type == "integer":
                insights[f"{col.name}_min"] = col.min_value
                insights[f"{col.name}_max"] = col.max_value
                insights[f"{col.name}_mean"] = col.mean_value
                insights[f"{col.name}_std"] = col.std_value
            elif col.data_type == "float":
                insights[f"{col.name}_min"] = col.min_value
                insights[f"{col.name}_max"] = col.max_value
                insights[f"{col.name}_mean"] = col.mean_value
                insights[f"{col.name}_std"] = col.std_value
            elif col.data_type == "string":
                insights[f"{col.name}_unique_count"] = col.unique_values
                insights[f"{col.name}_null_percentage"] = col.null_percentage
            elif col.data_type == "date":
                insights[f"{col.name}_min_date"] = col.min_value
                insights[f"{col.name}_max_date"] = col.max_value
                insights[f"{col.name}_mean_date"] = col.mean_value
                insights[f"{col.name}_std_date"] = col.std_value
            elif col.data_type == "boolean":
                insights[f"{col.name}_true_count"] = col.true_count
                insights[f"{col.name}_false_count"] = col.false_count
                insights[f"{col.name}_null_percentage"] = col.null_percentage
        
        return insights
    
    async def _enhanced_fallback_schema_analysis(self, dataset: Dataset, config: GenerationConfig) -> Dict[str, Any]:
        """
        Enhanced fallback for schema analysis if Claude fails.
        """
        logger.warning("Claude schema analysis failed, using enhanced fallback.")
        
        # This fallback would involve a more robust statistical analysis
        # and domain-specific insights.
        
        insights = {}
        for col in dataset.columns:
            insights[col.name] = {
                "type": col.data_type.value,
                "unique_values": col.unique_values,
                "null_count": col.null_count,
                "null_percentage": (col.null_count / dataset.row_count) * 100,
                "sample_values": col.get_sample_values()[:10],
                "privacy_category": col.privacy_category,
                "constraints": col.constraints or {},
                "business_meaning": col.business_meaning or "unknown"
            }
        
        # Add statistical insights
        insights["statistical_insights"] = await self._statistical_enhancement(dataset)
        
        return insights
    
    async def _fallback_generation_plan(self, schema_analysis: Dict[str, Any], config: GenerationConfig) -> Dict[str, Any]:
        """
        Fallback for generation plan if Claude fails.
        """
        logger.warning("Claude generation plan failed, using optimized fallback.")
        
        # This fallback would involve a simpler, more deterministic plan
        # based on statistical analysis and domain knowledge.
        
        plan = {
            "column_generation_order": list(schema_analysis["columns"].keys()),
            "column_types": {
                col["name"]: col["type"] for col in schema_analysis["columns"]
            },
            "batch_size": min(config.batch_size, max(100, config.rows // 10)),
            "parallel_workers": min(4, max(1, config.rows // 5000)),
            "memory_limit": "2GB",
            "timeout_per_batch": 300,
            "retry_strategy": "exponential_backoff"
        }
        
        return plan
    
    async def _prepare_pattern_analysis_samples(self, dataset: Dataset) -> Dict[str, Any]:
        """
        Prepares data samples for pattern analysis.
        """
        # This would involve loading a representative sample of the dataset
        # and ensuring it's in a format suitable for AI analysis.
        
        # For now, return a dummy sample
        return {
            "name": dataset.name,
            "description": dataset.description,
            "row_count": dataset.row_count,
            "column_count": len(dataset.columns),
            "sample_rows": [
                {
                    "id": i,
                    "values": [
                        {"name": col.name, "value": col.get_sample_values()[0]}
                        for col in dataset.columns
                    ]
                }
                for i in range(min(10, dataset.row_count))
            ]
        }
    
    async def _assess_statistical_similarity(
        self,
        original_dataset: Dataset,
        synthetic_data: pd.DataFrame
    ) -> float:
        """
        Assesses statistical similarity between original and synthetic data.
        """
        # This is a simplified check. A real system would use statistical tests
        # and domain-specific similarity metrics.
        
        # Example: Check if mean and standard deviation are close
        if "age" in original_dataset.columns and "age" in synthetic_data.columns:
            original_mean = original_dataset["age"].mean()
            synthetic_mean = synthetic_data["age"].mean()
            original_std = original_dataset["age"].std()
            synthetic_std = synthetic_data["age"].std()
            
            # Simple check: if means are close and stds are similar
            if abs(original_mean - synthetic_mean) < 1 and abs(original_std - synthetic_std) < 1:
                return 1.0
            else:
                return 0.0
        return 0.0
    
    async def _assess_distribution_fidelity(
        self,
        original_dataset: Dataset,
        synthetic_data: pd.DataFrame
    ) -> float:
        """
        Assesses distribution fidelity between original and synthetic data.
        """
        # This is a simplified check. A real system would use statistical tests
        # and domain-specific distribution metrics.
        
        # Example: Check if distributions are similar (e.g., for age)
        if "age" in original_dataset.columns and "age" in synthetic_data.columns:
            original_dist = original_dataset["age"].value_counts(normalize=True)
            synthetic_dist = synthetic_data["age"].value_counts(normalize=True)
            
            # Simple check: if distributions are very similar
            if original_dist.equals(synthetic_dist):
                return 1.0
            else:
                return 0.0
        return 0.0
    
    async def _assess_correlation_preservation(
        self,
        original_dataset: Dataset,
        synthetic_data: pd.DataFrame
    ) -> float:
        """
        Assesses correlation preservation between original and synthetic data.
        """
        # This is a simplified check. A real system would use statistical tests
        # and domain-specific correlation metrics.
        
        # Example: Check if correlation coefficients are close
        if "age" in original_dataset.columns and "income" in original_dataset.columns:
            original_corr = original_dataset[["age", "income"]].corr().iloc[0, 1]
            synthetic_corr = synthetic_data[["age", "income"]].corr().iloc[0, 1]
            
            # Simple check: if correlation coefficients are close
            if abs(original_corr - synthetic_corr) < 0.1:
                return 1.0
            else:
                return 0.0
        return 0.0
    
    async def _assess_privacy_protection(
        self,
        synthetic_data: pd.DataFrame,
        config: GenerationConfig
    ) -> float:
        """
        Assesses privacy protection of generated data.
        """
        # This is a simplified check. A real system would use statistical tests
        # and domain-specific privacy metrics.
        
        # Example: Check if sensitive columns are masked or obfuscated
        if config.privacy_level == "high":
            if "ssn" in synthetic_data.columns:
                if synthetic_data["ssn"].nunique() == len(synthetic_data["ssn"]):
                    return 0.0 # No obfuscation
                else:
                    return 1.0 # Obfuscation successful
        return 1.0 # Assume high privacy protection if no sensitive columns
    
    async def _assess_semantic_coherence(
        self,
        synthetic_data: pd.DataFrame,
        config: GenerationConfig
    ) -> float:
        """
        Assesses semantic coherence of generated data.
        """
        # This is a simplified check. A real system would use semantic similarity
        # and domain-specific coherence metrics.
        
        # Example: Check if generated text is coherent
        if "description" in synthetic_data.columns and "name" in synthetic_data.columns:
            if synthetic_data["description"].iloc[0] == synthetic_data["name"].iloc[0]:
                return 0.0 # Incoherent
            else:
                return 1.0 # Coherent
        return 1.0 # Assume coherent if no text columns
    
    async def _assess_constraint_compliance(
        self,
        synthetic_data: pd.DataFrame,
        config: GenerationConfig
    ) -> float:
        """
        Assesses constraint compliance of generated data.
        """
        # This is a simplified check. A real system would use statistical tests
        # and domain-specific constraint metrics.
        
        # Example: Check if constraints are met (e.g., for age)
        if config.custom_constraints:
            for constraint_name, constraint_details in config.custom_constraints.items():
                if constraint_name in synthetic_data.columns:
                    if "min_value" in constraint_details:
                        if not (synthetic_data[constraint_name] >= constraint_details["min_value"]).all():
                            return 0.0 # Constraint failed
                    if "max_value" in constraint_details:
                        if not (synthetic_data[constraint_name] <= constraint_details["max_value"]).all():
                            return 0.0 # Constraint failed
                    if "unique" in constraint_details:
                        if not (synthetic_data[constraint_name].nunique() == len(synthetic_data[constraint_name])):
                            return 0.0 # Constraint failed
        return 1.0 # Assume constraint compliance
    
    async def _apply_advanced_privacy_protection(
        self,
        synthetic_data: pd.DataFrame,
        config: GenerationConfig,
        schema_analysis: Dict[str, Any]
    ) -> pd.DataFrame:
        """
        Applies advanced privacy protection using the privacy engine.
        """
        logger.info("Applying advanced privacy protection")
        
        # Identify sensitive columns based on schema analysis
        sensitive_columns = [
            col["name"] for col in schema_analysis["columns"]
            if col["privacy_category"] == "sensitive"
        ]
        
        # Apply noise to sensitive columns
        if sensitive_columns:
            synthetic_data = self.privacy_engine.apply_noise(
                synthetic_data,
                sensitive_columns,
                config.epsilon,
                config.delta
            )
            logger.info(f"Applied noise to {len(sensitive_columns)} sensitive columns.")
        
        return synthetic_data
    
    async def _fallback_batch_generation(
        self,
        generation_plan: Dict[str, Any],
        batch_size: int,
        config: GenerationConfig
    ) -> pd.DataFrame:
        """
        Fallback generation strategy if the main AI generation fails.
        """
        logger.warning("Using fallback generation due to AI failure.")
        
        # This fallback would involve statistical generation or a simpler AI approach
        # For now, we'll just return an empty DataFrame or raise an error.
        # A more robust fallback would involve a statistical model or a simpler AI.
        
        # Example: Simple statistical generation (very basic)
        # This is a placeholder and would require a proper statistical model.
        # For demonstration, we'll return a DataFrame with random data.
        
        # Generate a dummy DataFrame with random data
        dummy_data = []
        for i in range(batch_size):
            row = {}
            for col_name in generation_plan["column_generation_order"]:
                if col_name in generation_plan["column_types"]:
                    if generation_plan["column_types"][col_name] == "integer":
                        row[col_name] = np.random.randint(1, 100)
                    elif generation_plan["column_types"][col_name] == "float":
                        row[col_name] = np.random.uniform(0.0, 100.0)
                    elif generation_plan["column_types"][col_name] == "string":
                        row[col_name] = "dummy_string_" + str(i)
                    elif generation_plan["column_types"][col_name] == "date":
                        row[col_name] = datetime.now() - timedelta(days=np.random.randint(1, 365))
                    elif generation_plan["column_types"][col_name] == "boolean":
                        row[col_name] = np.random.choice([True, False])
                    else:
                        row[col_name] = "unknown_type"
                else:
                    row[col_name] = "no_type_info"
            dummy_data.append(row)
        
        return pd.DataFrame(dummy_data) 

# === Advanced Prompt Engineering and Generation Optimization ===

class PromptOptimizer:
    """
    Dynamically builds context-aware prompts for synthetic data generation.
    """
    def build_context_aware_prompt(self, schema, sample_data, privacy_level):
        prompt = ""
        for col in schema or []:
            col_name = getattr(col, 'name', str(col))
            col_type = getattr(col, 'data_type', 'string')
            col_privacy = getattr(col, 'privacy_category', 'general')
            prompt += f"Column: {col_name}\nType: {col_type}\n"
            if sample_data is not None:
                # Add up to 3 few-shot examples for this column
                examples = [str(row.get(col_name, '')) for row in sample_data[:3]]
                prompt += f"Examples: {examples}\n"
            if col_privacy == 'sensitive' or privacy_level == 'high':
                prompt += "Instruction: Apply strict privacy protection.\n"
            else:
                prompt += "Instruction: Standard privacy.\n"
        prompt += f"Overall privacy level: {privacy_level}\n"
        return prompt

class ClaudeResponseProcessor:
    """
    Multi-stage validation and enhancement of Claude-generated data.
    """
    def validate_statistical_properties(self, original, synthetic):
        # For each numeric column, use KS test; for categorical, use chi-squared
        if original is None or synthetic is None:
            return {}
        results = {}
        for col in original.columns:
            if col not in synthetic.columns:
                continue
            if np.issubdtype(original[col].dtype, np.number):
                stat, p = ks_2samp(original[col].dropna(), synthetic[col].dropna())
                results[col] = {'ks_stat': stat, 'p_value': p}
            else:
                try:
                    obs = np.array([original[col].value_counts().reindex(synthetic[col].unique(), fill_value=0),
                                    synthetic[col].value_counts().reindex(synthetic[col].unique(), fill_value=0)])
                    chi2, p, _, _ = chi2_contingency(obs)
                    results[col] = {'chi2_stat': chi2, 'p_value': p}
                except Exception:
                    results[col] = {'chi2_stat': None, 'p_value': None}
        return results

    def repair_data_quality(self, synthetic_data):
        # Fix common issues: type mismatches, referential integrity, fill missing values
        if synthetic_data is None:
            return synthetic_data
        df = synthetic_data.copy()
        for col in df.columns:
            # Try to infer type from data
            if df[col].dtype == object:
                try:
                    df[col] = pd.to_numeric(df[col], errors='ignore')
                except Exception:
                    pass
            # Fill missing values
            if df[col].isnull().any():
                if np.issubdtype(df[col].dtype, np.number):
                    df[col] = df[col].fillna(df[col].mean())
                else:
                    df[col] = df[col].fillna('unknown')
        # TODO: Add referential integrity checks if foreign keys are known
        return df

class ContextManager:
    """
    Smart chunking for large datasets.
    """
    def chunk_intelligently(self, dataset, chunk_size=10000):
        # Split dataset into chunks, preserving relationships if possible
        if hasattr(dataset, 'to_dict'):
            df = pd.DataFrame(dataset.to_dict())
        elif isinstance(dataset, pd.DataFrame):
            df = dataset
        else:
            return [dataset]
        n = len(df)
        chunks = [df.iloc[i:i+chunk_size] for i in range(0, n, chunk_size)]
        # TODO: Add logic to preserve foreign key relationships across chunks
        return chunks

class AdaptiveLearning:
    """
    Adaptive learning from user feedback.
    """
    def __init__(self):
        self.feedback_store = defaultdict(list)  # generation_id -> list of (score, timestamp)
        self.prompt_profiles = defaultdict(dict)  # user_id or dataset_id -> prompt config

    def learn_from_user_feedback(self, generation_id, quality_score):
        import time
        self.feedback_store[generation_id].append((quality_score, time.time()))
        # TODO: Use feedback to adjust prompt strategies, e.g., via moving average or A/B test
        # For now, just store feedback
        return True

    def get_average_score(self, generation_id):
        scores = [score for score, _ in self.feedback_store[generation_id]]
        return np.mean(scores) if scores else None

class GenerationAnalytics:
    """
    Analytics and optimization for Claude-based generation.
    """
    def __init__(self):
        self.performance_log = []  # List of (timestamp, response_time, quality, cost)
        self.quality_degradation_events = []
        self.prompt_cache = {}  # schema_hash -> prompt

    def track_claude_performance(self, response_time=None, quality=None, cost=None):
        import time
        self.performance_log.append((time.time(), response_time, quality, cost))
        # Detect quality degradation
        if quality is not None and len(self.performance_log) > 5:
            recent = [q for _, _, q, _ in self.performance_log[-5:] if q is not None]
            if len(recent) == 5 and np.mean(recent) < 0.7:
                self.quality_degradation_events.append(time.time())
        # TODO: Add cost optimization logic
        return True

    def cache_prompt(self, schema_hash, prompt):
        self.prompt_cache[schema_hash] = prompt

    def get_cached_prompt(self, schema_hash):
        return self.prompt_cache.get(schema_hash) 