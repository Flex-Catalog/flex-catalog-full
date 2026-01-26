import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || 'product-catalog-uploads';

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: endpoint || undefined,
      forcePathStyle: true, // Required for LocalStack
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  async generateUploadUrl(
    tenantId: string,
    filename: string,
    contentType: string,
  ): Promise<{ url: string; key: string }> {
    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (!allowedTypes.includes(contentType)) {
      throw new BadRequestException(
        `File type ${contentType} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    // Validate filename
    const extension = filename.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `File extension .${extension} not allowed. Allowed: ${allowedExtensions.join(', ')}`,
      );
    }

    // Generate unique key
    const key = `uploads/${tenantId}/${uuidv4()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ACL: 'public-read',
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

    return { url, key };
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  getFileUrl(key: string): string {
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');
    if (endpoint) {
      // LocalStack or custom endpoint
      return `${endpoint}/${this.bucket}/${key}`;
    }
    // AWS S3 standard URL
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
