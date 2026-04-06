import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

/* ── Rank priority (highest first) ── */
const RANK_MAP = [
  { env: "DISCORD_ROLE_COMANDANTE", name: "COMANDANTE", icon: "👑", color: "#f472b6" },
  { env: "DISCORD_ROLE_GENERAL",    name: "GENERAL",    icon: "⚔️",  color: "#f97316" },
  { env: "DISCORD_ROLE_CAPITAN",    name: "CAPITAN",    icon: "💧", color: "#34d399" },
  { env: "DISCORD_ROLE_TENIENTE",   name: "TENIENTE",   icon: "🔑", color: "#60a5fa" },
  { env: "DISCORD_ROLE_SOLDADO",    name: "SOLDADO",    icon: "💀", color: "#a78bfa" },
  { env: "DISCORD_ROLE_RECLUTA",    name: "RECLUTA",    icon: "🔧", color: "#4ade80" },
  { env: "DISCORD_ROLE_ALIADO",     name: "ALIADO",     icon: "👤", color: "#94a3b8" },
];

const NOVATO_RANK = { name: "NOVATO", icon: "🎯", color: "#94a3b8" };

async function fetchGuildMember(accessToken) {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return null;
  try {
    const res = await fetch(
      `https://discord.com/api/users/@me/guilds/${guildId}/member`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function resolveRank(memberRoles = []) {
  for (const r of RANK_MAP) {
    const roleId = process.env[r.env];
    if (roleId && memberRoles.includes(roleId)) {
      return { name: r.name, icon: r.icon, color: r.color };
    }
  }
  return NOVATO_RANK;
}

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId:     process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "identify email guilds.members.read",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      /* Only on first sign-in */
      if (account?.access_token) {
        const member = await fetchGuildMember(account.access_token);
        token.callsign = member?.nick || profile?.global_name || token.name;
        token.avatar   = member?.avatar
          ? `https://cdn.discordapp.com/guilds/${process.env.DISCORD_GUILD_ID}/users/${token.sub}/avatars/${member.avatar}.png`
          : token.picture;
        token.rank = resolveRank(member?.roles ?? []);
        token.inGuild = !!member;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id       = token.sub;
      session.user.callsign = token.callsign ?? session.user.name;
      session.user.avatar   = token.avatar   ?? session.user.image;
      session.user.rank     = token.rank     ?? NOVATO_RANK;
      session.user.inGuild  = token.inGuild  ?? false;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
