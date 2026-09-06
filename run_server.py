"""Server launcher for SIH26027 AI-Powered Automatic Block Planning Engine."""
import uvicorn

if __name__ == "__main__":
    print("=" * 70)
    print("Starting Indian Railways Automatic Block Planning Engine (SIH26027)")
    print("Web Dashboard: http://localhost:8000")
    print("API Documentation: http://localhost:8000/docs")
    print("=" * 70)
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=False)
