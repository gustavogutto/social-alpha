import type { PostFeedItem, Profile, RecadoFeedItem } from '../types';

// Fake, view-only preview data - never touches Supabase. Ids are prefixed
// "demo-" so PostCard/UserProfileScreen/FriendsGrid can recognize them and
// keep interactions purely local (no network calls against fake ids).
// Simulates a friend group that's been active for about a week.
export const DEMO_PROFILES: Profile[] = [
  {
    id: 'demo-1',
    username: 'ana.beatriz',
    display_name: 'Ana Beatriz',
    avatar_url: null,
    bio: 'Vivendo um dia de cada vez. Café antes de tudo.',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'demo-2',
    username: 'joao.pedro',
    display_name: 'João Pedro',
    avatar_url: null,
    bio: 'Futebol de várzea aos domingos.',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'demo-3',
    username: 'carla.mendes',
    display_name: 'Carla Mendes',
    avatar_url: null,
    bio: 'Fotografia amadora, viagens baratas.',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'demo-4',
    username: 'lucas.tavares',
    display_name: 'Lucas Tavares',
    avatar_url: null,
    bio: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'demo-5',
    username: 'marina.rocha',
    display_name: 'Marina Rocha',
    avatar_url: null,
    bio: 'Sempre planejando a próxima viagem.',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'demo-6',
    username: 'rafael.nunes',
    display_name: 'Rafael Nunes',
    avatar_url: null,
    bio: 'Jogando até tarde, trabalhando até mais tarde ainda.',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'demo-7',
    username: 'bia.lima',
    display_name: 'Beatriz Lima',
    avatar_url: null,
    bio: 'Show bom é show em pé.',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'demo-8',
    username: 'pedro.henrique',
    display_name: 'Pedro Henrique',
    avatar_url: null,
    bio: 'Corrida de manhã, reclamação o resto do dia.',
    created_at: '2026-01-01T00:00:00Z',
  },
];

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// content, author id, hours ago, likes, liked by me
const RAW_POSTS: [string, string, number, number, boolean][] = [
  ['Domingo de sol e preguiça. Recomendo. ☀️', 'demo-1', 2, 4, false],
  ['Perdemos de 5 a 4 no pênalti mas o churrasco depois compensou tudo kkkk', 'demo-2', 5, 7, true],
  ['Testando a câmera nova no pôr do sol de hoje. Ainda aprendendo os ajustes manuais.', 'demo-3', 9, 12, false],
  ['Alguém mais só quer dormir até quarta-feira?', 'demo-4', 14, 9, false],
  ['3ª vitória seguida no ranked, hoje o dia foi bom 🎮', 'demo-6', 19, 5, false],
  ['Fiz pão de fermentação natural pela primeira vez e não cresceu quase nada. Amanhã tento de novo.', 'demo-1', 27, 6, true],
  ['Passagem pra Fortaleza saiu baratíssima, quem topa em outubro?', 'demo-5', 33, 3, false],
  ['5km hoje de manhã, o joelho reclamou mas valeu.', 'demo-8', 40, 8, false],
  ['Show foi TUDO. Voz ainda não voltou.', 'demo-7', 47, 15, true],
  ['Tentativa número 2 do pão, dessa vez cresceu! Só não sei se ficou bom por dentro ainda.', 'demo-1', 52, 10, false],
  ['Segunda-feira e já quebrei o fone de ouvido. Ótimo começo de semana.', 'demo-4', 61, 2, false],
  ['Alguém mais tá viciado nesse jogo novo? preciso de gente pra squad.', 'demo-6', 68, 6, false],
  ['Editando as fotos do fim de semana, tem coisa boa vindo por aí.', 'demo-3', 75, 9, false],
  ['Reunião que podia ter sido um e-mail, capítulo 4827.', 'demo-2', 82, 11, true],
  ['Café da manhã de hoje foi bem melhor que o de ontem, evoluindo devagar.', 'demo-1', 90, 4, false],
  ['Comprei a passagem! Fortaleza em outubro confirmado 🎉', 'demo-5', 98, 14, true],
  ['Corri 8km hoje, novo recorde pessoal.', 'demo-8', 108, 12, false],
  ['Ninguém me avisou que terça ia ser tão longa quanto segunda.', 'demo-7', 120, 5, false],
  ['Semana rendendo bem, esse fim de semana mereço descansar.', 'demo-4', 140, 7, false],
  ['Uma semana por aqui e já sinto que valeu a pena entrar.', 'demo-2', 158, 16, false],
];

export const DEMO_POSTS: PostFeedItem[] = RAW_POSTS.map(([content, authorId, hours, likeCount, likedByMe], i) => {
  const author = DEMO_PROFILES.find((p) => p.id === authorId)!;
  return {
    id: `demo-post-${i + 1}`,
    author_id: authorId,
    content,
    media_urls: [],
    visibility: i % 5 === 0 ? 'everyone' : 'friends',
    group_id: null,
    created_at: hoursAgo(hours),
    group_name: null,
    author_username: author.username,
    author_display_name: author.display_name,
    author_avatar_url: null,
    like_count: likeCount,
    comment_count: 0, // filled in below from DEMO_COMMENTS
    liked_by_me: likedByMe,
  };
});

export type DemoComment = {
  id: string;
  post_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

// [postIndex (1-based, matches demo-post-N), authorName, content, hoursAgoOffsetFromPost]
const RAW_COMMENTS: [number, string, string, number][] = [
  [1, 'João Pedro', 'Preguiça é subestimada mesmo', 1],
  [2, 'Ana Beatriz', 'Churrasco resolve tudo kkkk', 1],
  [2, 'Rafael Nunes', 'Pênalti perdido dói mais que joelho ralado', 2],
  [2, 'Marina Rocha', 'Quero foto do churrasco', 3],
  [3, 'Ana Beatriz', 'Ficou linda essa foto!', 1],
  [3, 'Pedro Henrique', 'Ajuste manual dá trabalho mas compensa', 2],
  [4, 'Beatriz Lima', 'Eu literalmente todos os dias', 2],
  [5, 'Pedro Henrique', 'Manda o nick que eu entro no squad', 1],
  [5, 'João Pedro', 'Já são 3 seguidas, respeita', 3],
  [6, 'Marina Rocha', 'Fermentação natural é osso mesmo no começo', 1],
  [6, 'Carla Mendes', 'Bora tentar de novo, não desiste', 4],
  [7, 'Ana Beatriz', 'EU VOU', 1],
  [7, 'João Pedro', 'Outubro em Fortaleza vai ser bom demais', 2],
  [8, 'Rafael Nunes', 'Joelho agradece o cuidado', 3],
  [9, 'Lucas Tavares', 'Inveja de quem ainda tem voz', 1],
  [9, 'Marina Rocha', 'Qual foi o show?', 2],
  [10, 'Ana Beatriz', 'Progresso é progresso, ficou com boa cara', 2],
  [10, 'Carla Mendes', 'Quero a receita quando sair perfeito', 5],
  [11, 'Rafael Nunes', 'Fone novo é vida', 2],
  [12, 'Pedro Henrique', 'To dentro, manda o horário', 1],
  [12, 'Beatriz Lima', 'Não conheço mas já quero jogar só de ver o post', 3],
  [13, 'Ana Beatriz', 'Ansiosa pra ver o resultado', 2],
  [14, 'Marina Rocha', 'Sinto muito, reunião desnecessária é osso', 1],
  [14, 'Lucas Tavares', 'Capítulo 4828 tá logo aí', 3],
  [16, 'João Pedro', 'Boaaa, agora é só esperar chegar outubro', 1],
  [16, 'Carla Mendes', 'Já quero ver as fotos da viagem', 2],
  [17, 'Beatriz Lima', 'Que absurdo, parabéns!', 1],
  [19, 'Rafael Nunes', 'Merece sim, semana longa', 4],
  [20, 'Ana Beatriz', 'Que bom ter você aqui!', 2],
  [20, 'Carla Mendes', 'Seja bem-vindo(a) à bagunça 😄', 5],
];

export const DEMO_COMMENTS: DemoComment[] = RAW_COMMENTS.map(([postIndex, authorName, content, offset], i) => {
  const post = DEMO_POSTS[postIndex - 1];
  const postHours = (Date.now() - new Date(post.created_at).getTime()) / (60 * 60 * 1000);
  return {
    id: `demo-comment-${i + 1}`,
    post_id: post.id,
    author_name: authorName,
    content,
    created_at: hoursAgo(Math.max(postHours - offset, 0.1)),
  };
});

// Sync comment_count on each post to how many demo comments it actually has.
const commentCountByPost = new Map<string, number>();
for (const c of DEMO_COMMENTS) {
  commentCountByPost.set(c.post_id, (commentCountByPost.get(c.post_id) ?? 0) + 1);
}
for (const post of DEMO_POSTS) {
  post.comment_count = commentCountByPost.get(post.id) ?? 0;
}

// Recados demo friends have left on the *real* logged-in user's wall, so a
// brand-new profile with demo mode on doesn't feel empty. profileId is
// filled in with the real user's id at render time.
export function getDemoRecadosForMe(profileId: string): RecadoFeedItem[] {
  const raw: [string, string, string, number][] = [
    ['demo-1', 'Ana Beatriz', 'Que bom te ver por aqui! Bem-vindo(a) 🎉', 150],
    ['demo-2', 'João Pedro', 'Segue o jogo que semana que vem tem resenha', 96],
    ['demo-5', 'Marina Rocha', 'Não esquece de confirmar presença na viagem de outubro!', 40],
  ];
  return raw.map(([authorId, authorName, content, hours], i) => {
    const author = DEMO_PROFILES.find((p) => p.id === authorId)!;
    return {
      id: `demo-recado-${i + 1}`,
      profile_id: profileId,
      author_id: authorId,
      content,
      created_at: hoursAgo(hours),
      author_username: author.username,
      author_display_name: authorName,
      author_avatar_url: null,
    };
  });
}
