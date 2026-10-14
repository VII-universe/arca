import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import path from "path";

Font.register({
  family: "NotoSans",
  fonts: [
    { src: path.join(process.cwd(), "lib/pdf/fonts/NotoSans-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(process.cwd(), "lib/pdf/fonts/NotoSans-Bold.ttf"), fontWeight: "bold" },
  ],
});

export interface LegacyBookChapter {
  title: string;
  unlockLabel: string;
  paragraphs: string[];
}

export interface LegacyBookData {
  packTitle: string;
  ownerName: string;
  recipientNames: string[];
  generatedOnLabel: string;
  forLabel: string;
  mainMessageLabel: string;
  chaptersLabel: string;
  footerLabel: string;
  mainParagraphs: string[];
  chapters: LegacyBookChapter[];
  // Points at the real recipient-facing URL regardless of the pack's
  // current status — whoever finds this physical PDF years from now scans
  // it to see the live page, which by then may well have unsealed. Always
  // present; optional only in the type so callers aren't forced to supply
  // it in tests.
  qrCodeDataUrl?: string;
  qrCodeLabel?: string;
}

const styles = StyleSheet.create({
  page: { padding: 56, fontFamily: "NotoSans", fontSize: 11, color: "#1a1a1a", lineHeight: 1.5 },
  cover: { flexGrow: 1, justifyContent: "center", alignItems: "center", textAlign: "center" },
  wordmark: { fontSize: 20, fontWeight: "bold", color: "#6b5847", marginBottom: 28 },
  coverTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 20, lineHeight: 1.3, maxWidth: 420 },
  coverMeta: { fontSize: 11, color: "#555", marginBottom: 6 },
  qrCode: { width: 84, height: 84, marginTop: 22 },
  qrCodeLabel: { fontSize: 9, color: "#888", marginTop: 6 },
  sectionHeading: { fontSize: 16, fontWeight: "bold", marginBottom: 12, marginTop: 8 },
  chapterHeading: { fontSize: 13, fontWeight: "bold", marginBottom: 4 },
  unlockLabel: { fontSize: 9, color: "#777", marginBottom: 10 },
  paragraph: { marginBottom: 10 },
  chapterBlock: { marginBottom: 24 },
  footer: {
    position: "absolute", bottom: 24, left: 56, right: 56,
    fontSize: 8, color: "#999", flexDirection: "row", justifyContent: "space-between",
  },
});

export function LegacyBookDocument({ data }: { data: LegacyBookData }) {
  const { packTitle, ownerName, recipientNames, generatedOnLabel, forLabel, mainMessageLabel, chaptersLabel, footerLabel, mainParagraphs, chapters, qrCodeDataUrl, qrCodeLabel } = data;

  return (
    <Document title={packTitle} author={ownerName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.wordmark}>arca</Text>
          <Text style={styles.coverTitle}>{packTitle}</Text>
          {recipientNames.length > 0 && <Text style={styles.coverMeta}>{forLabel}</Text>}
          <Text style={styles.coverMeta}>{generatedOnLabel}</Text>
          {qrCodeDataUrl && (
            <>
              {/* react-pdf's <Image> is a PDF primitive, not an HTML <img> —
                  it has no alt prop in its type at all. jsx-a11y doesn't
                  know the difference. */}
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={qrCodeDataUrl} style={styles.qrCode} />
              {qrCodeLabel && <Text style={styles.qrCodeLabel}>{qrCodeLabel}</Text>}
            </>
          )}
        </View>
        <View style={styles.footer}>
          <Text>{footerLabel}</Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        {mainParagraphs.length > 0 && (
          <View>
            <Text style={styles.sectionHeading}>{mainMessageLabel}</Text>
            {mainParagraphs.map((p, i) => (
              <Text key={i} style={styles.paragraph}>{p}</Text>
            ))}
          </View>
        )}

        {chapters.length > 0 && (
          <View>
            <Text style={styles.sectionHeading}>{chaptersLabel}</Text>
            {chapters.map((c, i) => (
              <View key={i} style={styles.chapterBlock}>
                <Text style={styles.chapterHeading}>{c.title}</Text>
                <Text style={styles.unlockLabel}>{c.unlockLabel}</Text>
                {c.paragraphs.map((p, j) => (
                  <Text key={j} style={styles.paragraph}>{p}</Text>
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
    </Document>
  );
}
