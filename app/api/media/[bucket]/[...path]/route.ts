import { ApiClientError } from "@/lib/api/client";
import { getMediaObject } from "@/lib/media/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bucket: string; path: string[] }> },
) {
  try {
    const { bucket, path } = await params;
    const mediaObject = await getMediaObject(bucket, path);

    return new Response(mediaObject.body, {
      headers: {
        "Cache-Control": mediaObject.cacheControl,
        "Content-Length": String(mediaObject.sizeBytes),
        "Content-Type": mediaObject.contentType,
      },
      status: 200,
    });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        {
          error: {
            code: error.code,
            details: error.details,
            message: error.message,
          },
        },
        { status: error.status },
      );
    }

    return Response.json(
      {
        error: {
          code: "MEDIA_FETCH_BAD_REQUEST",
          message: error instanceof Error ? error.message : "Media fetch failed.",
        },
      },
      { status: 400 },
    );
  }
}
