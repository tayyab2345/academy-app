import fs from "fs/promises"
import path from "path"
import { randomBytes } from "crypto"
import { getStore } from "@netlify/blobs"
import { del, get, head, put } from "@vercel/blob"
import { prisma } from "@/lib/prisma"

const IS_RAILWAY_RUNTIME = Boolean(
  process.env.RAILWAY_ENVIRONMENT_ID ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_PUBLIC_DOMAIN
)
const HAS_PERSISTENT_LOCAL_STORAGE_PATH = Boolean(
  process.env.DOCUMENT_STORAGE_PATH?.trim() ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim()
)

const STORAGE_BASE_PATH = path.resolve(
  process.env.DOCUMENT_STORAGE_PATH ||
    // Railway exposes the volume mount path at runtime; prefer it automatically when available.
    process.env.RAILWAY_VOLUME_MOUNT_PATH ||
    path.join(process.cwd(), "storage", "documents")
)

function resolveStorageProviderName() {
  const requestedProvider = process.env.STORAGE_PROVIDER?.trim().toLowerCase()

  if (requestedProvider === "local") {
    if (IS_RAILWAY_RUNTIME && !HAS_PERSISTENT_LOCAL_STORAGE_PATH) {
      console.warn(
        "[storage] STORAGE_PROVIDER=local without a mounted Railway volume is ephemeral. Falling back to persistent database storage."
      )
      return "database"
    }

    return "local"
  }

  if (requestedProvider) {
    return requestedProvider
  }

  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return "vercel_blob"
  }

  if (IS_RAILWAY_RUNTIME && !HAS_PERSISTENT_LOCAL_STORAGE_PATH) {
    return "database"
  }

  return "local"
}

const STORAGE_PROVIDER_NAME = resolveStorageProviderName()
const NETLIFY_BLOBS_STORE_NAME =
  process.env.NETLIFY_BLOBS_DOCUMENT_STORE?.trim() || "academy-documents"

function normalizeBaseUrl(rawBaseUrl: string) {
  if (/^https?:\/\//i.test(rawBaseUrl)) {
    return new URL(rawBaseUrl).pathname.replace(/\/+$/, "") || "/api/documents"
  }

  const trimmed = rawBaseUrl.trim().replace(/\/+$/, "").replace(/^\/?/, "/")
  return trimmed || "/api/documents"
}

const STORAGE_BASE_URL = normalizeBaseUrl(
  process.env.DOCUMENT_STORAGE_URL || "/api/documents"
)

function toPosixPath(value: string) {
  return value.replace(/\\/g, "/")
}

function isWithinBasePath(candidatePath: string) {
  const resolvedCandidate = path.resolve(candidatePath)
  return (
    resolvedCandidate === STORAGE_BASE_PATH ||
    resolvedCandidate.startsWith(`${STORAGE_BASE_PATH}${path.sep}`)
  )
}

export function normalizeStoredRelativePath(relativePath: string) {
  const normalized = path.posix.normalize(
    toPosixPath(relativePath).replace(/^\/+/, "")
  )

  if (
    !normalized ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    return null
  }

  return normalized
}

export function getDocumentUrlFromRelativePath(relativePath: string) {
  const normalized = normalizeStoredRelativePath(relativePath)

  if (!normalized) {
    throw new Error("Invalid document path")
  }

  return `${STORAGE_BASE_URL}/${normalized}`
}

export function getRelativeDocumentPathFromUrl(fileUrl: string) {
  const pathname = /^https?:\/\//i.test(fileUrl)
    ? new URL(fileUrl).pathname
    : fileUrl

  const normalizedPathname = pathname.replace(/\/+$/, "")
  const prefix = `${STORAGE_BASE_URL}/`

  if (!normalizedPathname.startsWith(prefix)) {
    return null
  }

  return normalizeStoredRelativePath(normalizedPathname.slice(prefix.length))
}

export function isStoredDocumentUrl(fileUrl: string | null | undefined) {
  if (!fileUrl) {
    return false
  }

  return Boolean(getRelativeDocumentPathFromUrl(fileUrl))
}

export function resolveDocumentAbsolutePath(relativePath: string) {
  const normalized = normalizeStoredRelativePath(relativePath)

  if (!normalized) {
    return null
  }

  const absolutePath = path.resolve(
    STORAGE_BASE_PATH,
    ...normalized.split("/").filter(Boolean)
  )

  return isWithinBasePath(absolutePath) ? absolutePath : null
}

export function getDocumentAbsolutePathFromUrl(fileUrl: string) {
  if (STORAGE_PROVIDER_NAME !== "local") {
    return null
  }

  const relativePath = getRelativeDocumentPathFromUrl(fileUrl)
  return relativePath ? resolveDocumentAbsolutePath(relativePath) : null
}

export interface StoredDocumentFile {
  buffer: Buffer
  fileName: string
  filePath: string
  fileUrl: string
  contentType?: string
}

export interface StorageResult {
  success: boolean
  filePath: string
  fileUrl: string
  fileName: string
  error?: string
}

export interface StorageProvider {
  upload(buffer: Buffer, filename: string, contentType: string): Promise<StorageResult>
  delete(filePath: string): Promise<boolean>
  getUrl(filePath: string): string
  read(filePath: string): Promise<StoredDocumentFile | null>
  exists(filePath: string): Promise<boolean>
}

function buildStoredDocumentLocation(filename: string) {
  const datePrefix = new Date().toISOString().split("T")[0]
  const randomSuffix = randomBytes(4).toString("hex")
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  const storedFilename = `${randomSuffix}_${safeFilename}`
  const relativePath = normalizeStoredRelativePath(
    `${datePrefix}/${storedFilename}`
  )

  return {
    datePrefix,
    storedFilename,
    relativePath,
  }
}

function normalizeStorageKey(filePath: string) {
  const normalized = normalizeStoredRelativePath(toPosixPath(filePath))
  return normalized ? normalized : null
}

function getMimeTypeForStoredFileName(fileName: string) {
  const normalized = fileName.toLowerCase()

  if (normalized.endsWith(".png")) {
    return "image/png"
  }

  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image/jpeg"
  }

  if (normalized.endsWith(".webp")) {
    return "image/webp"
  }

  if (normalized.endsWith(".pdf")) {
    return "application/pdf"
  }

  return "application/octet-stream"
}

class LocalStorageProvider implements StorageProvider {
  constructor(
    private readonly basePath: string,
    private readonly baseUrl: string
  ) {}

  async upload(
    buffer: Buffer,
    filename: string,
    _contentType: string
  ): Promise<StorageResult> {
    try {
      const { storedFilename, relativePath } = buildStoredDocumentLocation(
        filename
      )

      if (!relativePath) {
        return {
          success: false,
          filePath: "",
          fileUrl: "",
          fileName: "",
          error: "Invalid file path",
        }
      }

      const filePath = resolveDocumentAbsolutePath(relativePath)

      if (!filePath) {
        return {
          success: false,
          filePath: "",
          fileUrl: "",
          fileName: "",
          error: "Document path escaped storage root",
        }
      }

      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, buffer)

      return {
        success: true,
        filePath,
        fileUrl: `${this.baseUrl}/${relativePath}`,
        fileName: storedFilename,
      }
    } catch (error) {
      console.error("Failed to upload file:", error)
      return {
        success: false,
        filePath: "",
        fileUrl: "",
        fileName: "",
        error: error instanceof Error ? error.message : "Upload failed",
      }
    }
  }

  async delete(filePath: string) {
    try {
      const resolvedPath = path.isAbsolute(filePath)
        ? path.resolve(filePath)
        : resolveDocumentAbsolutePath(filePath)

      if (!resolvedPath || !isWithinBasePath(resolvedPath)) {
        return false
      }

      await fs.unlink(resolvedPath)
      return true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return false
      }

      console.error("Failed to delete file:", error)
      return false
    }
  }

  getUrl(filePath: string) {
    const relativePath = normalizeStoredRelativePath(
      toPosixPath(path.relative(this.basePath, filePath))
    )

    if (!relativePath) {
      throw new Error("Invalid stored file path")
    }

    return `${this.baseUrl}/${relativePath}`
  }

  async read(filePath: string): Promise<StoredDocumentFile | null> {
    const resolvedPath = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : resolveDocumentAbsolutePath(filePath)

    if (!resolvedPath || !isWithinBasePath(resolvedPath)) {
      return null
    }

    try {
      const buffer = await fs.readFile(resolvedPath)
      return {
        buffer,
        fileName: path.basename(resolvedPath),
        filePath: resolvedPath,
        fileUrl: this.getUrl(resolvedPath),
        contentType: getMimeTypeForStoredFileName(path.basename(resolvedPath)),
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Failed to read stored document:", error)
      }

      return null
    }
  }

  async exists(filePath: string) {
    const resolvedPath = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : resolveDocumentAbsolutePath(filePath)

    if (!resolvedPath || !isWithinBasePath(resolvedPath)) {
      return false
    }

    try {
      await fs.access(resolvedPath)
      return true
    } catch {
      return false
    }
  }
}

class DatabaseStorageProvider implements StorageProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly localFallback: LocalStorageProvider
  ) {}

  private normalizePath(filePath: string) {
    return normalizeStorageKey(filePath)
  }

  private toStoredDocumentFile(document: {
    path: string
    fileName: string
    content: Uint8Array | Buffer
    contentType: string
  }): StoredDocumentFile {
    return {
      buffer: Buffer.from(document.content),
      fileName: document.fileName,
      filePath: document.path,
      fileUrl: this.getUrl(document.path),
      contentType: document.contentType,
    }
  }

  private async readFromDatabase(filePath: string) {
    return prisma.storedDocument.findUnique({
      where: { path: filePath },
      select: {
        path: true,
        fileName: true,
        content: true,
        contentType: true,
      },
    })
  }

  private async migrateLegacyLocalDocument(filePath: string) {
    const legacyDocument = await this.localFallback.read(filePath)

    if (!legacyDocument) {
      return null
    }

    const contentType =
      legacyDocument.contentType || "application/octet-stream"

    const storedDocument = await prisma.storedDocument.upsert({
      where: { path: filePath },
      update: {
        fileName: legacyDocument.fileName,
        contentType,
        byteSize: legacyDocument.buffer.length,
        content: legacyDocument.buffer,
      },
      create: {
        path: filePath,
        fileName: legacyDocument.fileName,
        contentType,
        byteSize: legacyDocument.buffer.length,
        content: legacyDocument.buffer,
      },
      select: {
        path: true,
        fileName: true,
        content: true,
        contentType: true,
      },
    })

    return this.toStoredDocumentFile(storedDocument)
  }

  async upload(
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<StorageResult> {
    try {
      const { storedFilename, relativePath } = buildStoredDocumentLocation(
        filename
      )

      if (!relativePath) {
        return {
          success: false,
          filePath: "",
          fileUrl: "",
          fileName: "",
          error: "Invalid file path",
        }
      }

      await prisma.storedDocument.create({
        data: {
          path: relativePath,
          fileName: storedFilename,
          contentType,
          byteSize: buffer.length,
          content: buffer,
        },
      })

      return {
        success: true,
        filePath: relativePath,
        fileUrl: `${this.baseUrl}/${relativePath}`,
        fileName: storedFilename,
      }
    } catch (error) {
      console.error("Failed to upload file to database storage:", error)
      return {
        success: false,
        filePath: "",
        fileUrl: "",
        fileName: "",
        error: error instanceof Error ? error.message : "Upload failed",
      }
    }
  }

  async delete(filePath: string) {
    const normalizedPath = this.normalizePath(filePath)

    if (!normalizedPath) {
      return false
    }

    try {
      await prisma.storedDocument.delete({
        where: { path: normalizedPath },
      })
    } catch (error) {
      const code = (error as { code?: string } | null)?.code

      if (code !== "P2025") {
        console.error("Failed to delete document from database storage:", error)
        return false
      }
    }

    await this.localFallback.delete(normalizedPath)
    return true
  }

  getUrl(filePath: string) {
    const normalizedPath = this.normalizePath(filePath)

    if (!normalizedPath) {
      throw new Error("Invalid stored document path")
    }

    return `${this.baseUrl}/${normalizedPath}`
  }

  async read(filePath: string): Promise<StoredDocumentFile | null> {
    const normalizedPath = this.normalizePath(filePath)

    if (!normalizedPath) {
      return null
    }

    try {
      const storedDocument = await this.readFromDatabase(normalizedPath)

      if (storedDocument) {
        return this.toStoredDocumentFile(storedDocument)
      }

      return this.migrateLegacyLocalDocument(normalizedPath)
    } catch (error) {
      console.error("Failed to read stored document from database storage:", error)
      return null
    }
  }

  async exists(filePath: string) {
    const normalizedPath = this.normalizePath(filePath)

    if (!normalizedPath) {
      return false
    }

    try {
      const count = await prisma.storedDocument.count({
        where: { path: normalizedPath },
      })

      if (count > 0) {
        return true
      }

      return this.localFallback.exists(normalizedPath)
    } catch (error) {
      console.error("Failed to check database storage document:", error)
      return false
    }
  }
}

class NetlifyBlobsStorageProvider implements StorageProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly storeName: string
  ) {}

  private getBlobStore() {
    return getStore(this.storeName)
  }

  private normalizeKey(filePath: string) {
    return normalizeStoredRelativePath(toPosixPath(filePath))
  }

  async upload(
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<StorageResult> {
    try {
      const { storedFilename, relativePath } = buildStoredDocumentLocation(
        filename
      )

      if (!relativePath) {
        return {
          success: false,
          filePath: "",
          fileUrl: "",
          fileName: "",
          error: "Invalid file path",
        }
      }

      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer

      await this.getBlobStore().set(relativePath, arrayBuffer, {
        metadata: {
          fileName: storedFilename,
          contentType,
        },
      })

      return {
        success: true,
        filePath: relativePath,
        fileUrl: `${this.baseUrl}/${relativePath}`,
        fileName: storedFilename,
      }
    } catch (error) {
      console.error("Failed to upload file to Netlify Blobs:", error)
      return {
        success: false,
        filePath: "",
        fileUrl: "",
        fileName: "",
        error: error instanceof Error ? error.message : "Upload failed",
      }
    }
  }

  async delete(filePath: string) {
    try {
      const key = this.normalizeKey(filePath)

      if (!key) {
        return false
      }

      await this.getBlobStore().delete(key)
      return true
    } catch (error) {
      console.error("Failed to delete Netlify blob:", error)
      return false
    }
  }

  getUrl(filePath: string) {
    const key = this.normalizeKey(filePath)

    if (!key) {
      throw new Error("Invalid stored blob path")
    }

    return `${this.baseUrl}/${key}`
  }

  async read(filePath: string): Promise<StoredDocumentFile | null> {
    try {
      const key = this.normalizeKey(filePath)

      if (!key) {
        return null
      }

      const blob = await this.getBlobStore().getWithMetadata(key, {
        type: "arrayBuffer",
      })

      if (!blob) {
        return null
      }

      const storedFileName =
        typeof blob.metadata?.fileName === "string"
          ? blob.metadata.fileName
          : path.posix.basename(key)

      return {
        buffer: Buffer.from(blob.data),
        fileName: storedFileName,
        filePath: key,
        fileUrl: this.getUrl(key),
        contentType:
          typeof blob.metadata?.contentType === "string"
            ? blob.metadata.contentType
            : getMimeTypeForStoredFileName(storedFileName),
      }
    } catch (error) {
      console.error("Failed to read Netlify blob:", error)
      return null
    }
  }

  async exists(filePath: string) {
    try {
      const key = this.normalizeKey(filePath)

      if (!key) {
        return false
      }

      const metadata = await this.getBlobStore().getMetadata(key)
      return Boolean(metadata)
    } catch (error) {
      console.error("Failed to read Netlify blob metadata:", error)
      return false
    }
  }
}

class VercelBlobStorageProvider implements StorageProvider {
  constructor(private readonly baseUrl: string) {}

  private normalizePathname(filePath: string) {
    return normalizeStoredRelativePath(toPosixPath(filePath))
  }

  async upload(
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<StorageResult> {
    try {
      const { storedFilename, relativePath } = buildStoredDocumentLocation(
        filename
      )

      if (!relativePath) {
        return {
          success: false,
          filePath: "",
          fileUrl: "",
          fileName: "",
          error: "Invalid file path",
        }
      }

      const blob = await put(relativePath, buffer, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType,
      })

      return {
        success: true,
        filePath: blob.pathname,
        fileUrl: `${this.baseUrl}/${blob.pathname}`,
        fileName: storedFilename,
      }
    } catch (error) {
      console.error("Failed to upload file to Vercel Blob:", error)
      return {
        success: false,
        filePath: "",
        fileUrl: "",
        fileName: "",
        error: error instanceof Error ? error.message : "Upload failed",
      }
    }
  }

  async delete(filePath: string) {
    try {
      const pathname = this.normalizePathname(filePath)

      if (!pathname) {
        return false
      }

      await del(pathname)
      return true
    } catch (error) {
      console.error("Failed to delete Vercel blob:", error)
      return false
    }
  }

  getUrl(filePath: string) {
    const pathname = this.normalizePathname(filePath)

    if (!pathname) {
      throw new Error("Invalid stored blob path")
    }

    return `${this.baseUrl}/${pathname}`
  }

  async read(filePath: string): Promise<StoredDocumentFile | null> {
    try {
      const pathname = this.normalizePathname(filePath)

      if (!pathname) {
        return null
      }

      const blob = await get(pathname, {
        access: "private",
        useCache: false,
      })

      if (!blob || blob.statusCode !== 200 || !blob.stream) {
        return null
      }

      const arrayBuffer = await new Response(blob.stream).arrayBuffer()
      const contentDisposition = blob.blob.contentDisposition || ""
      const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i)
      const fileName =
        fileNameMatch?.[1] || path.posix.basename(blob.blob.pathname)

      return {
        buffer: Buffer.from(arrayBuffer),
        fileName,
        filePath: blob.blob.pathname,
        fileUrl: this.getUrl(blob.blob.pathname),
        contentType:
          blob.blob.contentType || getMimeTypeForStoredFileName(fileName),
      }
    } catch (error) {
      console.error("Failed to read Vercel blob:", error)
      return null
    }
  }

  async exists(filePath: string) {
    try {
      const pathname = this.normalizePathname(filePath)

      if (!pathname) {
        return false
      }

      await head(pathname)
      return true
    } catch (error) {
      console.error("Failed to read Vercel blob metadata:", error)
      return false
    }
  }
}

let storageProvider: StorageProvider | null = null

export function getStorageProvider() {
  if (!storageProvider) {
    const localStorageProvider = new LocalStorageProvider(
      STORAGE_BASE_PATH,
      STORAGE_BASE_URL
    )

    if (STORAGE_PROVIDER_NAME === "local") {
      storageProvider = localStorageProvider
    } else if (STORAGE_PROVIDER_NAME === "database") {
      storageProvider = new DatabaseStorageProvider(
        STORAGE_BASE_URL,
        localStorageProvider
      )
    } else if (STORAGE_PROVIDER_NAME === "netlify_blobs") {
      storageProvider = new NetlifyBlobsStorageProvider(
        STORAGE_BASE_URL,
        NETLIFY_BLOBS_STORE_NAME
      )
    } else if (STORAGE_PROVIDER_NAME === "vercel_blob") {
      storageProvider = new VercelBlobStorageProvider(STORAGE_BASE_URL)
    } else {
      console.warn(
        `Unknown storage provider: ${STORAGE_PROVIDER_NAME}, falling back to local storage`
      )
      storageProvider = localStorageProvider
    }

    console.info("[storage] initialized provider", {
      provider: STORAGE_PROVIDER_NAME,
      isRailwayRuntime: IS_RAILWAY_RUNTIME,
      hasPersistentLocalStoragePath: HAS_PERSISTENT_LOCAL_STORAGE_PATH,
    })
  }

  return storageProvider
}

export async function storeDocument(
  buffer: Buffer,
  filename: string,
  contentType: string = "application/pdf"
) {
  return getStorageProvider().upload(buffer, filename, contentType)
}

export async function deleteDocument(filePath: string) {
  return getStorageProvider().delete(filePath)
}

export async function deleteStoredDocumentByUrl(fileUrl: string | null | undefined) {
  const relativePath = fileUrl ? getRelativeDocumentPathFromUrl(fileUrl) : null

  if (!relativePath) {
    return false
  }

  return deleteDocument(relativePath)
}

export function getDocumentUrl(filePath: string) {
  return getStorageProvider().getUrl(filePath)
}

export async function readStoredDocumentFromUrl(
  fileUrl: string
): Promise<StoredDocumentFile | null> {
  const relativePath = getRelativeDocumentPathFromUrl(fileUrl)

  if (!relativePath) {
    return null
  }

  return getStorageProvider().read(relativePath)
}

export async function storedDocumentExists(fileUrl: string) {
  const relativePath = getRelativeDocumentPathFromUrl(fileUrl)

  if (!relativePath) {
    return false
  }

  return getStorageProvider().exists(relativePath)
}
