import { BaseApplication } from '@/base';
import { IController, MinioKeys } from '@/common';
import { ApplicationLogger, IUploadFile, LoggerFactory, MinioHelper } from '@/helpers';
import { getError } from '@/utilities';
import { CoreBindings, inject } from '@loopback/core';
import { api, del, get, param, post, Request, Response, RestBindings } from '@loopback/rest';
import multer from 'multer';

@api({ basePath: '/static-assets' })
export class StaticAssetController implements IController {
  protected logger: ApplicationLogger;
  private temporaryStorage: multer.StorageEngine;

  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE) protected application: BaseApplication,
    @inject(RestBindings.Http.REQUEST) private request: Request,
    @inject(RestBindings.Http.RESPONSE) private response: Response,
  ) {
    this.temporaryStorage = multer.memoryStorage();
    this.logger = LoggerFactory.getLogger([StaticAssetController.name]);
  }

  @post('/buckets/{bucket_name}', {
    responses: {
      '200': {
        description: 'Create minio bucket with name',
        content: { 'application/json': {} },
      },
    },
  })
  createBucket(@param.path.string('bucket_name') bucketName: string) {
    const minioInstance = this.application.getSync<MinioHelper>(MinioKeys.MINIO_INSTANCE);
    return minioInstance.createBucket({ name: bucketName });
  }

  @del('/buckets/{bucket_name}', {
    responses: {
      '200': {
        description: 'Delete minio bucket by name',
        content: { 'application/json': {} },
      },
    },
  })
  removeBucket(@param.path.string('bucket_name') bucketName: string) {
    const minioInstance = this.application.getSync<MinioHelper>(MinioKeys.MINIO_INSTANCE);
    return minioInstance.removeBucket({ name: bucketName });
  }

  @get('/buckets/{bucket_name}', {
    responses: {
      '200': {
        description: 'Get minio bucket by name',
        content: { 'application/json': {} },
      },
    },
  })
  getBucket(@param.path.string('bucket_name') bucketName: string) {
    const minioInstance = this.application.getSync<MinioHelper>(MinioKeys.MINIO_INSTANCE);
    return minioInstance.getBucket({ name: bucketName });
  }

  @get('/buckets', {
    responses: {
      '200': {
        description: 'Get minio bucket by name',
        content: { 'application/json': {} },
      },
    },
  })
  getBuckets() {
    const minioInstance = this.application.getSync<MinioHelper>(MinioKeys.MINIO_INSTANCE);
    return minioInstance.getBuckets();
  }

  @post('/buckets/{bucket_name}/upload', {
    responses: {
      '200': {
        description: 'Upload files to bucket',
        content: { 'application/json': {} },
      },
    },
  })
  uploadObject(@param.path.string('bucket_name') bucketName: string) {
    const minioInstance = this.application.getSync<MinioHelper>(MinioKeys.MINIO_INSTANCE);
    return new Promise((resolve, reject) => {
      multer({ storage: this.temporaryStorage }).array('files')(this.request, this.response, error => {
        if (error) {
          this.logger.error('[uploadObject] Fail to upload files! Error: %s', error);
          reject(error);
        }

        const { files } = this.request;
        minioInstance.upload({ bucket: bucketName, files: files as Array<IUploadFile> }).then(rs => {
          resolve(rs);
        });
      });
    });
  }

  @get('/{bucket_name}/{object_name}/download')
  downloadObject(
    @param.path.string('bucket_name') bucketName: string,
    @param.path.string('object_name') objectName: string,
  ) {
    const minioInstance = this.application.getSync<MinioHelper>(MinioKeys.MINIO_INSTANCE);
    return new Promise(() => {
      minioInstance.getStat({ bucket: bucketName, name: objectName }).then(fileStat => {
        const { size, metaData } = fileStat;
        this.response.set({
          ...metaData,
          'Content-Length': size,
          'Content-Disposition': `attachment; filename=${objectName}`,
        });

        minioInstance.getFile({
          bucket: bucketName,
          name: objectName,
          onStreamData: (error, stream) => {
            if (error) {
              throw getError({
                message: `[downloadObject] Cannot download ${objectName}! Error while streaming data to client!`,
                statusCode: 500,
              });
            }

            stream.pipe(this.response);
            stream.on('end', () => {
              this.response.end();
            });
          },
        });
      });
    });
  }

  @get('/{bucket_name}/{object_name}')
  getStaticObject(
    @param.path.string('bucket_name') bucketName: string,
    @param.path.string('object_name') objectName: string,
  ) {
    const minioInstance = this.application.getSync<MinioHelper>(MinioKeys.MINIO_INSTANCE);
    return new Promise(() => {
      minioInstance.getStat({ bucket: bucketName, name: objectName }).then(fileStat => {
        const { size, metaData } = fileStat;
        this.response.writeHead(206, { ...metaData, 'Content-Length': size });

        minioInstance.getFile({
          bucket: bucketName,
          name: objectName,
          onStreamData: (error, stream) => {
            if (error) {
              throw getError({
                message: `[getStaticObject] Cannot stream ${objectName}! Error while streaming data to client!`,
                statusCode: 500,
              });
            }

            stream.pipe(this.response);
          },
        });
      });
    });
  }
}
