package com.smartbanking.asset.service;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Component
public class AssetPhotoStorage {
  private final Path baseDir;

  public AssetPhotoStorage(@Value("${asset.photos.dir:/data/asset-photos}") String dir) {
    this.baseDir = Path.of(dir);
  }

  public StoredFile store(UUID assetId, UUID photoId, MultipartFile file) {
    try {
      Files.createDirectories(baseDir.resolve(assetId.toString()));

      String original = StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "photo";
      String ext = extensionFor(file.getContentType(), original);
      String filename = photoId + ext;
      Path target = baseDir.resolve(assetId.toString()).resolve(filename).normalize();
      if (!target.startsWith(baseDir)) {
        throw new IllegalArgumentException("Invalid path");
      }

      try (InputStream in = file.getInputStream()) {
        Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
      }
      String storagePath = assetId + "/" + filename;
      return new StoredFile(storagePath, target);
    } catch (Exception e) {
      throw new RuntimeException("Failed to store photo", e);
    }
  }

  public Path resolve(String storagePath) {
    Path path = baseDir.resolve(storagePath).normalize();
    if (!path.startsWith(baseDir)) {
      throw new IllegalArgumentException("Invalid path");
    }
    return path;
  }

  private static String extensionFor(String contentType, String originalFilename) {
    if (contentType != null) {
      String ct = contentType.toLowerCase(Locale.ROOT);
      if (ct.contains("png")) return ".png";
      if (ct.contains("jpeg") || ct.contains("jpg")) return ".jpg";
      if (ct.contains("webp")) return ".webp";
      if (ct.startsWith("image/")) return ".img";
    }
    String ext = StringUtils.getFilenameExtension(originalFilename);
    return ext == null ? "" : "." + ext;
  }

  public record StoredFile(String storagePath, Path absolutePath) {}
}

