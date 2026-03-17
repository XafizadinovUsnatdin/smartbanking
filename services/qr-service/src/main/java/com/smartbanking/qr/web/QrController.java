package com.smartbanking.qr.web;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.smartbanking.qr.service.QrTokenService;
import com.smartbanking.qr.service.QrViewService;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class QrController {
  private final QrTokenService tokenService;
  private final QrViewService viewService;
  private final String payloadBaseUrl;

  public QrController(
      QrTokenService tokenService,
      QrViewService viewService,
      @Value("${qr.payload-base-url:}") String payloadBaseUrl
  ) {
    this.tokenService = tokenService;
    this.viewService = viewService;
    this.payloadBaseUrl = payloadBaseUrl == null ? "" : payloadBaseUrl.trim();
  }

  public record QrResponse(String token, String pngBase64) {}

  @PostMapping("/qr/assets/{assetId}")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  public QrResponse generate(@PathVariable UUID assetId, @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
    String token = tokenService.issueToken(assetId);
    String qrPayload = buildQrPayload(token);
    byte[] png = renderLabelPng(qrPayload, token, authorization);
    return new QrResponse(token, Base64.getEncoder().encodeToString(png));
  }

  public record BulkTokensRequest(List<UUID> assetIds) {}

  public record AssetTokenResponse(UUID assetId, String token, String payload) {}

  @PostMapping("/qr/assets/tokens")
  @PreAuthorize("hasAnyRole('ADMIN','IT_ADMIN','ASSET_MANAGER')")
  public List<AssetTokenResponse> bulkTokens(@RequestBody BulkTokensRequest req) {
    if (req == null || req.assetIds() == null || req.assetIds().isEmpty()) {
      return List.of();
    }
    return req.assetIds().stream()
        .map(assetId -> {
          String token = tokenService.issueToken(assetId);
          return new AssetTokenResponse(assetId, token, buildQrPayload(token));
        })
        .toList();
  }

  public record QrLookupResponse(UUID assetId) {}

  @GetMapping("/qr/{token}")
  public QrLookupResponse lookup(@PathVariable String token) {
    return new QrLookupResponse(tokenService.resolveAssetId(token));
  }

  @GetMapping("/qr/{token}/view")
  public QrViewService.QrAssetView view(
      @PathVariable String token,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization
  ) {
    return viewService.view(token, authorization);
  }

  @GetMapping("/qr/photos/{photoId}")
  public ResponseEntity<byte[]> photo(@PathVariable UUID photoId) {
    var res = viewService.downloadPhoto(photoId);
    MediaType mt;
    try {
      mt = MediaType.parseMediaType(res.contentType());
    } catch (Exception e) {
      mt = MediaType.APPLICATION_OCTET_STREAM;
    }
    return ResponseEntity.ok()
        .contentType(mt)
        .body(res.bytes());
  }

  private String buildQrPayload(String token) {
    if (payloadBaseUrl == null || payloadBaseUrl.isBlank()) {
      return token;
    }
    String base = payloadBaseUrl.endsWith("/") ? payloadBaseUrl.substring(0, payloadBaseUrl.length() - 1) : payloadBaseUrl;
    String encoded = URLEncoder.encode(token, StandardCharsets.UTF_8);
    return base + "/qr/" + encoded;
  }

  private byte[] renderLabelPng(String qrPayload, String token, String authorizationHeader) {
    try {
      var view = viewService.view(token, authorizationHeader);
      String name = view == null || view.asset() == null ? null : view.asset().name();
      String serial = view == null || view.asset() == null ? null : view.asset().serialNumber();
      String owner = view == null || view.owner() == null
          ? "UNASSIGNED"
          : (view.owner().displayName() == null || view.owner().displayName().isBlank()
              ? String.valueOf(view.owner().ownerId())
              : view.owner().displayName());
      return renderLabelPng(qrPayload, name, serial, owner);
    } catch (Exception e) {
      // Fallback to a plain QR image if downstream calls fail.
      return renderPng(qrPayload);
    }
  }

  private byte[] renderLabelPng(String qrPayload, String assetName, String serialNumber, String ownerDisplay) {
    try {
      int padding = 18;
      int headerHeight = 56;
      int footerHeight = 74;
      int qrSize = 320;
      int width = qrSize + padding * 2;
      int height = headerHeight + qrSize + footerHeight;

      BufferedImage canvas = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
      Graphics2D g = canvas.createGraphics();
      g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
      g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
      g.setColor(Color.WHITE);
      g.fillRect(0, 0, width, height);

      // Header
      String title = assetName == null || assetName.isBlank() ? "Asset" : assetName;
      g.setColor(new Color(17, 24, 39)); // gray-900
      Font titleFont = new Font("SansSerif", Font.BOLD, 18);
      g.setFont(titleFont);
      FontMetrics titleFm = g.getFontMetrics();
      String titleLine = truncate(titleFm, title, width - padding * 2);
      g.drawString(titleLine, padding, 28);

      g.setColor(new Color(107, 114, 128)); // gray-500
      Font subFont = new Font("SansSerif", Font.PLAIN, 12);
      g.setFont(subFont);
      g.drawString("SmartBanking - QR", padding, 46);

      // QR
      QRCodeWriter writer = new QRCodeWriter();
      BitMatrix matrix = writer.encode(qrPayload, BarcodeFormat.QR_CODE, qrSize, qrSize);
      BufferedImage qrImg = MatrixToImageWriter.toBufferedImage(matrix);
      g.drawImage(qrImg, padding, headerHeight, null);

      // Footer
      g.setColor(new Color(17, 24, 39));
      Font bodyFont = new Font("SansSerif", Font.PLAIN, 13);
      g.setFont(bodyFont);
      FontMetrics bodyFm = g.getFontMetrics();

      String serial = serialNumber == null || serialNumber.isBlank() ? "-" : serialNumber;
      String owner = ownerDisplay == null || ownerDisplay.isBlank() ? "UNASSIGNED" : ownerDisplay;

      int x = padding;
      int y1 = headerHeight + qrSize + 28;
      int y2 = y1 + 20;

      g.drawString(truncate(bodyFm, "Serial: " + serial, width - padding * 2), x, y1);
      g.drawString(truncate(bodyFm, "Owner: " + owner, width - padding * 2), x, y2);

      g.dispose();

      ByteArrayOutputStream out = new ByteArrayOutputStream();
      javax.imageio.ImageIO.write(canvas, "PNG", out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  private static String truncate(FontMetrics fm, String text, int maxWidthPx) {
    if (text == null) return "";
    if (fm.stringWidth(text) <= maxWidthPx) return text;
    String ellipsis = "...";
    int ellipsisWidth = fm.stringWidth(ellipsis);
    int available = Math.max(0, maxWidthPx - ellipsisWidth);
    int len = text.length();
    while (len > 0 && fm.stringWidth(text.substring(0, len)) > available) {
      len--;
    }
    return text.substring(0, Math.max(0, len)) + ellipsis;
  }

  private byte[] renderPng(String text) {
    try {
      QRCodeWriter writer = new QRCodeWriter();
      BitMatrix matrix = writer.encode(text, BarcodeFormat.QR_CODE, 300, 300);
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      MatrixToImageWriter.writeToStream(matrix, "PNG", out);
      return out.toByteArray();
    } catch (WriterException | java.io.IOException e) {
      throw new RuntimeException(e);
    }
  }
}
