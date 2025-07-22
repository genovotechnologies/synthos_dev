from fastapi import APIRouter

router = APIRouter()

@router.get("/features")
async def get_features():
    return [
        {
            "title": "Smart Data Generation",
            "description": "Generate high-quality synthetic data that maintains statistical properties",
            "icon": "database"
        },
        {
            "title": "Privacy-First",
            "description": "Built-in privacy protection with GDPR compliance and differential privacy",
            "icon": "shield"
        },
        {
            "title": "Quality Analytics",
            "description": "Comprehensive quality metrics and statistical validation for your data",
            "icon": "bar-chart-3"
        },
        {
            "title": "API-First Design",
            "description": "Robust REST API with SDKs for Python, JavaScript, and R",
            "icon": "globe"
        }
    ]

@router.get("/testimonials")
async def get_testimonials():
    return [
        {
            "name": "CHIBOY",
            "role": "Data Scientist",
            "content": "Synthos has revolutionized our data pipeline. The quality is exceptional.",
            "avatar": "CB"
        },
        {
            "name": "Gasper Samuel",
            "role": "ML Engineer",
            "content": "The privacy features give us confidence to work with sensitive datasets.",
            "avatar": "GS"
        },
        {
            "name": "Seun",
            "role": "ML/AI Engineer",
            "content": "Easy integration and fantastic API. Our development time dropped by 60%.",
            "avatar": "SA"
        }
    ] 