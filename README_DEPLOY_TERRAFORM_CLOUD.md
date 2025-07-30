# Synthos AWS Deployment: Terraform Cloud + GitHub Actions

This guide will help you deploy your backend to AWS ECS Fargate using **Terraform Cloud** for infrastructure automation and **GitHub Actions** for Docker image build/push automation. You can also use the traditional S3 backend if you prefer.

---

## 1. Prerequisites
- AWS account with admin or sufficient permissions
- [Terraform Cloud account](https://app.terraform.io/)
- (Recommended) GitHub repository for your code and Terraform files

---

## 2. Terraform Cloud Setup

### a. Update `main.tf`
- The backend is set to use Terraform Cloud by default:
  ```hcl
  terraform {
    backend "remote" {
      organization = "YOUR_TERRAFORM_CLOUD_ORG"
      workspaces {
        name = "synthos-aws"
      }
    }
    # S3 backend (uncomment to use S3 instead)
    # backend "s3" { ... }
  }
  ```
- Replace `YOUR_TERRAFORM_CLOUD_ORG` with your Terraform Cloud organization name.

### b. Push to GitHub
- Commit and push your code and Terraform files to your GitHub repository.

### c. Create Workspace in Terraform Cloud
- Go to Terraform Cloud > Workspaces > Create Workspace
- Connect your GitHub repo and select the correct branch

### d. Add AWS Credentials to Terraform Cloud
- Go to Workspace > Variables
- Add the following environment variables:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
- (Optional) Add any other variables from your `backend.env` as needed

### e. Queue a Plan/Apply
- Terraform Cloud will automatically run `terraform plan` and `terraform apply` on every push.

---

## 3. Docker Image Automation with GitHub Actions

### a. ECR Repository
- Terraform will create an ECR repository for you (or you can create it manually).

### b. Add GitHub Secrets
- In your GitHub repo, go to Settings > Secrets and variables > Actions
- Add:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION` (e.g., `us-east-1`)
  - `ECR_REPOSITORY` (e.g., `synthos-backend`)
  - `ECR_REGISTRY` (e.g., `123456789012.dkr.ecr.us-east-1.amazonaws.com`)

### c. Add the provided GitHub Actions workflow (see `.github/workflows/docker-ecr.yml`)
- This workflow will:
  - Build your Docker image on every push
  - Log in to ECR
  - Push the image to ECR

---

## 4. Fallback: Use S3 Backend
- If you want to use the S3 backend instead of Terraform Cloud:
  - Comment out the `remote` backend block in `main.tf`
  - Uncomment the `s3` backend block
  - Run `terraform init` and `terraform apply` locally (requires AWS CLI and Terraform installed)

---

## 5. Environment Variables
- Add your environment variables (from `backend.env`) to ECS via Terraform variables or the AWS Console.
- Sensitive values should be stored as secrets in Terraform Cloud or AWS Secrets Manager.

---

## 6. Accessing Your Backend
- If you enabled the Application Load Balancer, your backend will be accessible via the ALB DNS name.
- Only your API endpoints are public; your code and environment remain private.

---

## 7. Need Help?
- Ask for a full example of the GitHub Actions workflow or Terraform variable setup if needed! 