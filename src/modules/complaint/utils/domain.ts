// A denúncia guarda o link como quem denunciou digitou: "www.loja.com/produto/1?utm=x",
// "http://loja.com", "LOJA.com/". Comparar a string crua contra a URL que o visitante
// cola nunca casaria. O que identifica o site denunciado é o host, e é por ele que se busca.

// Sufixos de dois rótulos: em "loja.com.br" o domínio registrável é "loja.com.br",
// não "com.br". Sem essa lista, o pré-filtro de "com.br" devolveria o banco inteiro.
const MULTI_LABEL_SUFFIXES = [
    'com.br', 'net.br', 'org.br', 'gov.br', 'edu.br', 'art.br', 'blog.br',
    'co.uk', 'org.uk', 'gov.uk', 'ac.uk',
    'com.ar', 'com.mx', 'com.pt', 'com.co', 'com.au', 'co.jp',
];

// Host válido: rótulos alfanuméricos separados por ponto, com pelo menos um ponto.
// "localhost" e um IP não são site denunciável aqui.
const HOST_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

// Extrai o host de uma URL digitada à mão, sem protocolo, com caminho ou com porta.
// Devolve null quando não há host reconhecível, a busca deve recusar, não chutar.
export const normalizeHost = (input: string | null | undefined): string | null => {
    if (!input) return null;

    const trimmed = input.trim();
    if (!trimmed) return null;

    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    let host: string;
    try {
        host = new URL(withScheme).hostname.toLowerCase();
    } catch {
        return null;
    }

    // O ponto final do FQDN ("loja.com.") e o "www." não distinguem site nenhum.
    host = host.replace(/\.$/, '').replace(/^www\./, '');

    return HOST_PATTERN.test(host) ? host : null;
};

// Domínio registrável do host, "pagamento.loja.com.br" vira "loja.com.br".
// É o termo do pré-filtro no banco: casa o host buscado, seus subdomínios e seu domínio pai.
export const baseDomain = (host: string): string => {
    const labels = host.split('.');
    const suffix = MULTI_LABEL_SUFFIXES.find((s) => host.endsWith(`.${s}`));

    const keep = suffix ? suffix.split('.').length + 1 : 2;

    return labels.length <= keep ? host : labels.slice(-keep).join('.');
};

// Dois hosts são o mesmo site denunciado quando são iguais ou um é subdomínio do outro.
// Vale nos dois sentidos de propósito: quem cola "pagamento.loja.com" precisa ver a
// denúncia feita contra "loja.com", e quem cola "loja.com" precisa ver a do subdomínio.
// Compara rótulo a rótulo, "outraloja.com" não é subdomínio de "loja.com".
export const isSameSite = (a: string, b: string): boolean =>
    a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
