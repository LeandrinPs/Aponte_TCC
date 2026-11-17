package com.aponte.Service;

import com.aponte.Exception.RecursoNaoEncontradoException;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.*;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImagensService {
  private static final Logger log = LoggerFactory.getLogger(ImagensService.class);
  private final Path raiz;

  public ImagensService(@Value("${aponte.uploads.dir:./uploads}") String diretorio) {
    raiz = Path.of(diretorio).toAbsolutePath().normalize();
  }

  public String salvar(MultipartFile arquivo) {
    if (arquivo.isEmpty() || arquivo.getSize() > 5 * 1024 * 1024) {
      throw new IllegalArgumentException("Envie uma fotografia JPEG ou PNG de até 5 MB");
    }
    Path destino = null;
    boolean criou = false;
    try (var entrada = ImageIO.createImageInputStream(arquivo.getInputStream())) {
      if (entrada == null) throw new IllegalArgumentException("Imagem inválida");
      var leitores = ImageIO.getImageReaders(entrada);
      if (!leitores.hasNext())
        throw new IllegalArgumentException("Formato inválido: utilize JPEG ou PNG");
      var leitor = leitores.next();
      BufferedImage imagem;
      String formato;
      try {
        leitor.setInput(entrada);
        formato = leitor.getFormatName().toLowerCase(java.util.Locale.ROOT);
        if (!formato.equals("jpeg") && !formato.equals("png")) {
          throw new IllegalArgumentException("Formato inválido: utilize JPEG ou PNG");
        }
        int largura = leitor.getWidth(0), altura = leitor.getHeight(0);
        if (largura > 6000 || altura > 6000 || (long) largura * altura > 12000000) {
          throw new IllegalArgumentException(
              "Fotografia muito grande: limite de 12 megapixels e 6000 pixels por lado");
        }
        String tipo = arquivo.getContentType();
        if (tipo != null && !tipo.equals(formato.equals("png") ? "image/png" : "image/jpeg")) {
          throw new IllegalArgumentException("O tipo informado não corresponde à imagem");
        }
        imagem = leitor.read(0);
      } finally {
        leitor.dispose();
      }
      String nome = UUID.randomUUID() + (formato.equals("png") ? ".png" : ".jpg");
      Files.createDirectories(raiz);
      destino = raiz.resolve(nome);
      try (var saida = Files.newOutputStream(destino, StandardOpenOption.CREATE_NEW)) {
        criou = true;
        if (!ImageIO.write(imagem, formato, saida))
          throw new IOException("Codificador indisponível");
      }
      return nome;
    } catch (IOException e) {
      if (criou && destino != null) removerArquivo(destino.getFileName().toString());
      throw new IllegalArgumentException("Não foi possível ler ou armazenar a fotografia", e);
    }
  }

  public Resource carregar(String nome) {
    Path caminho = caminhoSeguro(nome);
    if (!Files.isRegularFile(caminho) || Files.isSymbolicLink(caminho)) {
      throw new RecursoNaoEncontradoException("Imagem não encontrada");
    }
    return new FileSystemResource(caminho);
  }

  private Path caminhoSeguro(String nome) {
    if (nome == null || !nome.matches("[a-f0-9-]{36}\\.(png|jpg)")) {
      throw new RecursoNaoEncontradoException("Imagem não encontrada");
    }
    return raiz.resolve(nome).normalize();
  }

  public void removerAposConfirmacao(String nome) {
    if (nome == null) return;
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            removerArquivo(nome);
          }
        });
  }

  public void removerSeRollback(String nome) {
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCompletion(int status) {
            if (status != STATUS_COMMITTED) removerArquivo(nome);
          }
        });
  }

  private void removerArquivo(String nome) {
    try {
      Files.deleteIfExists(caminhoSeguro(nome));
    } catch (IOException | RecursoNaoEncontradoException e) {
      log.warn("Não foi possível remover o arquivo de imagem {}", nome, e);
    }
  }
}
