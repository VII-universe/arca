import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import "./fonts";
import type { LegacyBookChapter } from "./LegacyBookDocument";

export interface VaultBookPackSection {
  packTitle: string;
  forLabel: string;
  qrCodeDataUrl?: string;
  mainParagraphs: string[];
  chapters: LegacyBookChapter[];
}

export interface VaultBookData {
  ownerName: string;
  generatedOnLabel: string;
  packCountLabel: string;
  mainMessageLabel: string;
  chaptersLabel: string;
  footerLabel: string;
  packs: VaultBookPackSection[];
}

const styles = StyleSheet.create({
  page: { padding: 56, fontFamily: "NotoSans", fontSize: 11, color: "#1a1a1a", lineHeight: 1.5 },
  cover: { flexGrow: 1, justifyContent: "center", alignItems: "center", textAlign: "center" },
  wordmark: { fontSize: 20, fontWeight: "bold", color: "#6b5847", marginBottom: 28 },
  coverTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  coverMeta: { fontSize: 11, color: "#555", marginBottom: 6 },
  qrCode: { width: 72, height: 72, marginTop: 10, marginBottom: 4 },
  packHeading: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  packMeta: { fontSize: 10, color: "#777", marginBottom: 16 },
  sectionHeading: { fontSize: 14, fontWeight: "bold", marginBottom: 10, marginTop: 6 },
  chapterHeading: { fontSize: 12, fontWeight: "bold", marginBottom: 4 },
  unlockLabel: { fontSize: 9, color: "#777", marginBottom: 10 },
  paragraph: { marginBottom: 10 },
  chapterBlock: { marginBottom: 20 },
  packSection: { marginBottom: 8 },
  divider: { borderBottom: "1px solid #ddd", marginBottom: 20 },
  footer: {
    position: "absolute", bottom: 24, left: 56, right: 56,
    fontSize: 8, color: "#999", flexDirection: "row", justifyContent: "space-between",
  },
});

export function VaultBookDocument({ data }: { data: VaultBookData }) {
  const { ownerName, generatedOnLabel, packCountLabel, mainMessageLabel, chaptersLabel, footerLabel, packs } = data;

  return (
    <Document title={`${ownerName} — ARCA`} author={ownerName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.wordmark}>arca</Text>
          <Text style={styles.coverTitle}>{ownerName}</Text>
          <Text style={styles.coverMeta}>{packCountLabel}</Text>
          <Text style={styles.coverMeta}>{generatedOnLabel}</Text>
        </View>
        <View style={styles.footer}>
          <Text>{footerLabel}</Text>
        </View>
      </Page>

      {packs.map((pack, i) => (
        <Page key={i} size="A4" style={styles.page} wrap>
          <View style={styles.packSection}>
            <Text style={styles.packHeading}>{pack.packTitle}</Text>
            <Text style={styles.packMeta}>{pack.forLabel}</Text>
            {pack.qrCodeDataUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's <Image> has no alt prop, it isn't HTML
              <Image src={pack.qrCodeDataUrl} style={styles.qrCode} />
            )}
            <View style={styles.divider} />
          </View>

          {pack.mainParagraphs.length > 0 && (
            <View>
              <Text style={styles.sectionHeading}>{mainMessageLabel}</Text>
              {pack.mainParagraphs.map((p, j) => (
                <Text key={j} style={styles.paragraph}>{p}</Text>
              ))}
            </View>
          )}

          {pack.chapters.length > 0 && (
            <View>
              <Text style={styles.sectionHeading}>{chaptersLabel}</Text>
              {pack.chapters.map((c, j) => (
                <View key={j} style={styles.chapterBlock}>
                  <Text style={styles.chapterHeading}>{c.title}</Text>
                  <Text style={styles.unlockLabel}>{c.unlockLabel}</Text>
                  {c.paragraphs.map((p, k) => (
                    <Text key={k} style={styles.paragraph}>{p}</Text>
                  ))}
                </View>
              ))}
            </View>
          )}

          <Text
            style={styles.footer}
            render={({ pageNumber, totalPages }) => `${footerLabel}  ·  ${pageNumber} / ${totalPages}`}
            fixed
          />
        </Page>
      ))}
    </Document>
  );
}
