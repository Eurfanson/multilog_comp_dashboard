// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";

// list of GitHub usernames allowed to log in
const allowedIds = [
  126807919,         // you
  210891881,
  "sapluoist",       // 1 person
  "KaanIrfanoglu",   // exact username
  "Eurfanson"        // second username for same person
];

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: { params: { scope: "read:user" } }, // no repo scope needed
    }),
  ],
callbacks: {
  async signIn({ profile }) {
    console.log("GitHub login attempt by:", profile?.id);
    if (allowedIds.includes(profile?.id)) {
      return true;
    }
    console.log("User not allowed:", profile?.login);
    return false;
  },
},

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
