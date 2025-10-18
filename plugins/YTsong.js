const { cmd } = require("../command");
const yts = require("yt-search");
const axios = require("axios");

cmd(
  {
    pattern: "song",
    react: "🎵",
    desc: "Download YouTube Audio",
    category: "download",
    filename: __filename,
  },
  async (malvin, mek, m, { from, args, reply }) => {
    try {
      const q = args.join(" ");
      if (!q) return reply("*Provide a name or a YouTube link.* 🎵❤️");

      // 1) Find the URL
      let url = q;
      try {
        url = new URL(q).toString();
      } catch {
        const s = await yts(q);
        if (!s?.videos?.length) return reply("❌ No videos found!");
        url = s.videos[0].url;
      }

      // 2) Validate URL
      if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
        return reply("❌ Invalid YouTube URL!");
      }

      // 3) Fetch metadata
      let info;
      try {
        const searchResult = await yts(url);
        if (!searchResult?.videos?.length) {
          return reply("❌ Failed to fetch video metadata!");
        }
        info = searchResult.videos[0];
      } catch (e) {
        console.error("Metadata fetch error:", e);
        return reply("❌ Error fetching video metadata: " + e.message);
      }

      // 4) Send metadata + thumbnail
      const desc = `
🧩 *NICK MD AUDIO DOWNLOADER* 🧩

📌 *Title:* ${info.title || "Unknown"}
⏱️ *Uploaded:* ${info.timestamp || "N/A"} (${info.ago || "N/A"})
👀 *Views:* ${info.views?.toLocaleString() || "N/A"}
🔗 *Download URL:* ${info.url || url}

━━━━━━━━━━━━━━━━━━
*YOUNGBOY🪀*
      `.trim();

      await malvin.sendMessage(
        from,
        { image: { url: info.thumbnail || "https://i.ibb.co/SDWZFh23/malvin-xd.jpg" }, caption: desc },
        { quoted: mek }
      );

      // 5) Audio download helper
      const downloadAudio = async (videoUrl, quality = "mp3") => {
        const apiUrl = `https://malvin-api.vercel.app/download/youtube?url=${encodeURIComponent(
          videoUrl
        )}&api=dfcb6d76f2f6a9894gjkege8a4ab232222`;

        const res = await axios.get(apiUrl);
        if (!res.data.success) throw new Error("Failed to fetch audio details.");

        const { id, title } = res.data;
        const progressUrl = `https://p.oceansaver.in/ajax/progress.php?id=${id}`;

        // Poll until ready
        while (true) {
          const prog = (await axios.get(progressUrl)).data;
          if (prog.success && prog.progress === 1000) {
            const audio = await axios.get(prog.download_url, { responseType: "arraybuffer" });
            return { buffer: audio.data, title: title || info.title || "audio" };
          }
          await new Promise((r) => setTimeout(r, 5000));
        }
      };

      // 6) Download + send
      const { buffer, title } = await downloadAudio(url);
      await malvin.sendMessage(
        from,
        {
          audio: buffer,
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: `${title}.mp3`,
        },
        { quoted: mek }
      );

      reply("*Thanks for using my MP3 bot!* 🎵");
    } catch (e) {
      console.error("Error:", e);
      reply(`❌ Error: ${e.message}`);
    }
  }
);
