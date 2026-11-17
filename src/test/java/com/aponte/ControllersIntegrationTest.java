package com.aponte;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.aponte.Entity.*;
import com.aponte.Repository.*;
import com.aponte.Security.PrincipalAponte;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.*;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ControllersIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired UsuarioRepository usuarios;
  @Autowired AdministradorRepository admins;
  @Autowired PasswordEncoder senhas;
  static final Path FOTOS;

  static {
    try {
      FOTOS = Files.createTempDirectory("aponte-fotos-http-");
    } catch (Exception e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  @DynamicPropertySource
  static void fotos(DynamicPropertyRegistry r) {
    r.add("aponte.uploads.dir", () -> FOTOS.toString());
    r.add("aponte.google.maps-key", () -> "chave-somente-para-teste");
  }

  JsonMapper json = JsonMapper.builder().build();
  MockHttpSession usuario, admin, outro;

  @BeforeEach
  void preparar() {
    Usuario u = new Usuario();
    u.setNome("Ana");
    u.setEmail("ana@http.test");
    u.setSenha(senhas.encode("SenhaTeste123!"));
    u = usuarios.saveAndFlush(u);
    usuario = sessao(PrincipalAponte.usuario(u));
    Usuario b = new Usuario();
    b.setNome("Bia");
    b.setEmail("bia@http.test");
    b.setSenha(u.getSenha());
    b = usuarios.saveAndFlush(b);
    outro = sessao(PrincipalAponte.usuario(b));
    Administrador a = new Administrador();
    a.setNome("gestor");
    a.setSenhahash(u.getSenha());
    a = admins.saveAndFlush(a);
    admin = sessao(PrincipalAponte.administrador(a));
  }

  MockHttpSession sessao(PrincipalAponte p) {
    var s = new MockHttpSession();
    s.setAttribute(
        HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
        new SecurityContextImpl(
            UsernamePasswordAuthenticationToken.authenticated(p, null, p.getAuthorities())));
    return s;
  }

  String proprio =
      """
{"nome":"Restaurante HTTP","descricao":"Cadastro próprio","rua":"Rua A","numero":"1","bairro":"Centro","cidade":"Cidade","estado":"SP","cep":"00000-000","latitude":"-20.28","longitude":"-50.24"}
""";

  long criarProprio() throws Exception {
    var res =
        mvc.perform(
                post("/api/admin/estabelecimentos")
                    .session(admin)
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(proprio))
            .andExpect(status().isCreated())
            .andReturn();
    return json.readTree(res.getResponse().getContentAsString()).get("id").asLong();
  }

  @Test
  void paginasERecursosSaoServidosPeloSpring() throws Exception {
    for (String p :
        new String[] {
          "/",
          "/index.html",
          "/map.html",
          "/catalo.html",
          "/forma.html",
          "/entra.html",
          "/sobre.html",
          "/privacidade.html",
          "/termos.html",
          "/css/integracao.css",
          "/js/app.js",
          "/img/imagem.jpeg"
        }) mvc.perform(get(p)).andExpect(status().isOk());
    mvc.perform(get("/admin")).andExpect(status().is3xxRedirection());
    mvc.perform(get("/favoritos.html")).andExpect(status().is3xxRedirection());
  }

  @Test
  void inicioCarregaScriptsUmaVezEUtilizaChaveConfigurada() throws Exception {
    var html =
        mvc.perform(get("/index.html"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(html).doesNotContain("SUA_CHAVE");
    for (String trecho :
        new String[] {"/js/app.js", "maps.googleapis.com/maps/api/js", "</body>"}) {
      assertThat(html.indexOf(trecho))
          .isGreaterThanOrEqualTo(0)
          .isEqualTo(html.lastIndexOf(trecho));
    }
    assertThat(html).contains("chave-somente-para-teste");
  }

  @Test
  void cadastroLoginLogoutPelaSessao() throws Exception {
    mvc.perform(
            post("/api/usuarios")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"nome\":\"Nova\",\"email\":\"nova@http.test\",\"senha\":\"SenhaTeste123!\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.senha").doesNotExist());
    var login =
        mvc.perform(
                post("/login")
                    .with(csrf())
                    .param("username", "nova@http.test")
                    .param("password", "SenhaTeste123!"))
            .andExpect(status().is3xxRedirection())
            .andReturn();
    var s = (MockHttpSession) login.getRequest().getSession(false);
    mvc.perform(get("/api/sessao").session(s))
        .andExpect(jsonPath("$.autenticado").value(true))
        .andExpect(jsonPath("$.administrador").value(false));
    mvc.perform(post("/logout").session(s).with(csrf())).andExpect(status().is3xxRedirection());
    assertThat(s.isInvalid()).isTrue();
  }

  @Test
  void requisicaoDeFaviconNaoViraDestinoDepoisDoLogin() throws Exception {
    var s = new MockHttpSession();
    mvc.perform(get("/favicon.ico").session(s)).andExpect(redirectedUrl("/img/logo1.png"));
    mvc.perform(
            post("/login")
                .session(s)
                .with(csrf())
                .param("username", "ana@http.test")
                .param("password", "SenhaTeste123!"))
        .andExpect(redirectedUrl("/map.html"));
  }

  @Test
  void loginAdministrativoDirecionaParaPainel() throws Exception {
    mvc.perform(
            post("/login")
                .with(csrf())
                .param("username", "admin:gestor")
                .param("password", "SenhaTeste123!"))
        .andExpect(redirectedUrl("/admin"));
  }

  @Test
  void csrfEPermissoesImpedemAlteracoesIndevidas() throws Exception {
    mvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/me/favoritos")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/admin/usuarios").session(usuario)).andExpect(status().isForbidden());
    mvc.perform(get("/admin").session(usuario)).andExpect(status().isForbidden());
    mvc.perform(
            post("/api/admin/estabelecimentos")
                .session(usuario)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(proprio))
        .andExpect(status().isForbidden());
  }

  @Test
  void favoritosPersistemEntreRequisicoesESaoDoUsuarioAtual() throws Exception {
    String ref = "{\"googlePlaceId\":\"Place-HTTP\"}";
    mvc.perform(
            post("/api/me/favoritos")
                .session(usuario)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(ref))
        .andExpect(status().isCreated());
    mvc.perform(get("/api/me/favoritos").session(usuario))
        .andExpect(jsonPath("$.length()").value(1));
    mvc.perform(get("/api/me/favoritos").session(outro)).andExpect(jsonPath("$.length()").value(0));
    mvc.perform(
            post("/api/me/favoritos")
                .session(usuario)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(ref))
        .andExpect(status().isConflict());
    mvc.perform(
            delete("/api/me/favoritos")
                .param("googlePlaceId", "Place-HTTP")
                .session(usuario)
                .with(csrf()))
        .andExpect(status().isNoContent());
  }

  @Test
  void placeIdsPreservamMaiusculasEDiferemDoIdInterno() throws Exception {
    for (String place : new String[] {"Place-Case", "Place-case"})
      mvc.perform(
              post("/api/me/favoritos")
                  .session(usuario)
                  .with(csrf())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"googlePlaceId\":\"" + place + "\"}"))
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.estabelecimento.dadosProprios").isEmpty());
    mvc.perform(get("/api/me/favoritos").session(usuario))
        .andExpect(jsonPath("$.length()").value(2));
  }

  @Test
  void avaliacoesRespeitamAutoriaEMedia() throws Exception {
    String body =
        "{\"referencia\":{\"googlePlaceId\":\"Place-Notas\"},\"dados\":{\"nota\":4,\"comentario\":\"Bom\"}}";
    var r =
        mvc.perform(
                post("/api/me/avaliacoes")
                    .session(usuario)
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(status().isCreated())
            .andReturn();
    long id = json.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    mvc.perform(
            put("/api/me/avaliacoes/" + id)
                .session(outro)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nota\":1}"))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/avaliacoes/resumo").param("googlePlaceId", "Place-Notas"))
        .andExpect(jsonPath("$.media").value(4.0))
        .andExpect(jsonPath("$.quantidade").value(1));
    mvc.perform(
            put("/api/me/avaliacoes/" + id)
                .session(usuario)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nota\":5}"))
        .andExpect(status().isOk());
    mvc.perform(delete("/api/admin/avaliacoes/" + id).session(admin).with(csrf()))
        .andExpect(status().isNoContent());
  }

  @Test
  void administracaoCardapioEIndicadoresUsamDadosReais() throws Exception {
    long id = criarProprio();
    mvc.perform(get("/api/estabelecimentos"))
        .andExpect(jsonPath("$[0].dadosProprios.nome").value("Restaurante HTTP"));
    var r =
        mvc.perform(
                post("/api/admin/cardapios")
                    .session(admin)
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"referencia\":{\"id\":"
                            + id
                            + "},\"dados\":{\"nome\":\"Prato\",\"descricao\":\"Arroz\",\"preco\":12.50}}"))
            .andExpect(status().isCreated())
            .andReturn();
    long item = json.readTree(r.getResponse().getContentAsString()).get("id").asLong();
    mvc.perform(get("/api/cardapios").param("id", String.valueOf(id)))
        .andExpect(jsonPath("$[0].nome").value("Prato"));
    mvc.perform(get("/api/admin/resumo").session(admin))
        .andExpect(jsonPath("$.usuarios").value(2))
        .andExpect(jsonPath("$.proprios").value(1));
    mvc.perform(delete("/api/admin/estabelecimentos/" + id).session(admin).with(csrf()))
        .andExpect(status().isConflict());
    mvc.perform(delete("/api/admin/cardapios/" + item).session(admin).with(csrf()))
        .andExpect(status().isNoContent());
  }

  @Test
  void uploadValidaConteudoEServeAImagem() throws Exception {
    long id = criarProprio();
    var out = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(20, 20, BufferedImage.TYPE_INT_RGB), "png", out);
    var arquivo =
        new MockMultipartFile("arquivo", "../../foto.png", "image/png", out.toByteArray());
    var r =
        mvc.perform(
                multipart("/api/admin/estabelecimentos/" + id + "/foto")
                    .file(arquivo)
                    .session(admin)
                    .with(csrf()))
            .andExpect(status().isOk())
            .andReturn();
    String url = json.readTree(r.getResponse().getContentAsString()).get("fotoUrl").asText();
    assertThat(url).matches("/imagens/[a-f0-9-]{36}\\.png");
    mvc.perform(get(url))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.IMAGE_PNG));
    mvc.perform(
            multipart("/api/admin/estabelecimentos/" + id + "/foto")
                .file(
                    new MockMultipartFile(
                        "arquivo", "ruim.svg", "image/svg+xml", "<svg/>".getBytes()))
                .session(admin)
                .with(csrf()))
        .andExpect(status().isBadRequest());
  }

  @Test
  void fotografiaAcimaDoLimiteEhRecusada() throws Exception {
    long id = criarProprio();
    var grande =
        new MockMultipartFile("arquivo", "grande.jpg", "image/jpeg", new byte[5 * 1024 * 1024 + 1]);
    mvc.perform(
            multipart("/api/admin/estabelecimentos/" + id + "/foto")
                .file(grande)
                .session(admin)
                .with(csrf()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.mensagem").value("Envie uma fotografia JPEG ou PNG de até 5 MB"));
  }

  @Test
  void errosNaoExpoemDetalhesDoBanco() throws Exception {
    mvc.perform(get("/api/cardapios/999999"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.mensagem").value("Item de cardápio não encontrado"));
    mvc.perform(get("/api/avaliacoes")).andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/me/avaliacoes")
                .session(usuario)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"referencia\":{\"googlePlaceId\":\"Place\"},\"dados\":{\"nota\":9}}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.trace").doesNotExist());
  }
}
