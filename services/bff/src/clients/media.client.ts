import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

export type MediaAsset = {
  assetId: string;
  uploadId: string;
  ownerUserId: string;
  purpose: string;
  sourceUrl: string;
  mimeType: string;
  status: string;
  createdAt: string;
};

type MediaGrpcService = {
  createAssetFromSource(request: {
    ownerUserId: string;
    sourceUrl: string;
    purpose: string;
  }): Observable<MediaAsset>;
  getAssetById(request: { assetId: string }): Observable<MediaAsset>;
  getAssetsByIds(request: { assetIds: string[] }): Observable<{ assets?: MediaAsset[] }>;
};

@Injectable()
export class MediaClientService implements OnModuleInit {
  private service!: MediaGrpcService;

  constructor(@Inject("MEDIA_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<MediaGrpcService>("MediaService");
  }

  createAssetFromSource(request: {
    ownerUserId: string;
    sourceUrl: string;
    purpose: string;
  }) {
    return lastValueFrom(this.service.createAssetFromSource(request));
  }

  getAssetById(assetId: string) {
    return lastValueFrom(this.service.getAssetById({ assetId }));
  }

  getAssetsByIds(assetIds: string[]) {
    return lastValueFrom(this.service.getAssetsByIds({ assetIds })).then((response) => response.assets ?? []);
  }
}
