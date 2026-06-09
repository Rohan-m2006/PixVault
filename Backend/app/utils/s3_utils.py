# backend/app/utils/s3_utils.py
import boto3
import os
import uuid
from fastapi import HTTPException

# Read AWS keys from .env
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_BUCKET = os.getenv("AWS_BUCKET_NAME")

# Create the AWS connection client
s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=AWS_REGION
)

rekognition_client = boto3.client(
    "rekognition",
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=os.getenv("AWS_REKOGNITION_REGION", "us-east-1")
)

import mimetypes
from typing import Optional


def upload_file_to_s3(
    file_bytes: bytes,
    original_filename: str,
    content_type: Optional[str] = None
) -> str:
    """Uploads a file to AWS S3 and returns the public URL."""
    try:
        file_extension = original_filename.split(".")[-1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{file_extension}"

        guessed_type = content_type or mimetypes.guess_type(original_filename)[0]

        if not guessed_type:
            if file_extension in ["mp4", "mov", "webm", "mkv"]:
                guessed_type = "video/mp4"
            else:
                guessed_type = f"image/{file_extension}"

        s3_client.put_object(
            Bucket=AWS_BUCKET,
            Key=unique_filename,
            Body=file_bytes,
            ContentType=guessed_type
        )

        s3_url = f"https://{AWS_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{unique_filename}"
        return s3_url

    except Exception as e:
        print(f"S3 Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload image to cloud storage")