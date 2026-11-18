declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    KILOBYTE_ADMIN_EMAIL?: string;
  }
}
