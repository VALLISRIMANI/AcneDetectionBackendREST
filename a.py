import os

# Define the folder structure and files specifically for the src/ layout
structure = {
    "src/config": ["db.js", "cors.js", "jwt.js", "rateLimiter.js", "cloudinary.js", "mailer.js", "cron.js"],
    "src/models": [
        "User.js", "AcneProfile.js", "ImagePrediction.js", "TreatmentPlan.js", 
        "DailyCard.js", "Review.js", "Payment.js", "EmailLog.js", "Otp.js", "AIAdjustmentLog.js"
    ],
    "src/routes": [
        "auth.routes.js", "profile.routes.js", "prediction.routes.js", 
        "treatment.routes.js", "review.routes.js", "payment.routes.js", 
        "agent.routes.js", "email.routes.js", "dermatologist.routes.js"
    ],
    "src/controllers": [
        "auth.controller.js", "profile.controller.js", "prediction.controller.js", 
        "treatment.controller.js", "review.controller.js", "payment.controller.js", 
        "agent.controller.js", "email.controller.js", "dermatologist.controller.js"
    ],
    "src/services": [
        "otp.service.js", "token.service.js", "severity.service.js", "grok.service.js", 
        "ml.service.js", "email.service.js", "treatment.service.js", "payment.service.js", 
        "compliance.service.js", "dermatologist.service.js"
    ],
    "src/middlewares": [
        "auth.middleware.js", "error.middleware.js", "upload.middleware.js", 
        "otpLimiter.middleware.js", "predictionLimiter.middleware.js", "validate.middleware.js"
    ],
    "src/validators": [
        "auth.validator.js", "profile.validator.js", "prediction.validator.js", 
        "review.validator.js", "payment.validator.js"
    ],
    "src/utils": [
        "generateOtp.js", "hash.js", "logger.js", "dateHelper.js", 
        "apiResponse.js", "constants.js"
    ],
    "src/prompts": ["treatment.prompt.js", "dermatologist.prompt.js"],
    "src/jobs": ["dailyReminder.job.js", "complianceCheck.job.js", "modification.job.js"],
    "tests": ["auth.test.js", "severity.test.js", "treatment.test.js", "integration.test.js"]
}

root_files = ["server.js", ".env", ".env.example", "package.json", "README.md"]

def create_backend_structure():
    # 1. Create root files
    for file in root_files:
        if not os.path.exists(file):
            with open(file, 'w') as f:
                # Add basic placeholder content for package.json
                if file == "package.json":
                    f.write('{\n  "name": "acnedetectionbackendrest",\n  "version": "1.0.0",\n  "main": "server.js"\n}')
            print(f"📄 Created root file: {file}")

    # 2. Create nested directories and files
    for folder, files in structure.items():
        if not os.path.exists(folder):
            os.makedirs(folder, exist_ok=True)
            print(f"📁 Created directory: {folder}")
        
        for file in files:
            file_path = os.path.join(folder, file)
            if not os.path.exists(file_path):
                with open(file_path, 'w') as f:
                    f.write(f"// {file}\n")
                print(f"  └─ 📄 {file}")

if __name__ == "__main__":
    print("🛠️  Initializing Acne Detection Backend Structure...")
    create_backend_structure()
    print("\n✅ Structure generated successfully! Ready for Module 1.")