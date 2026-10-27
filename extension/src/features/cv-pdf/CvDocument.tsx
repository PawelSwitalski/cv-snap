import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CvEntry, CvModel, CvSection } from "./cv-model";
import { CV_FONT_FAMILY } from "./fonts";

/** Right-to-left output languages (best effort: text alignment only). */
const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur"]);

const styles = StyleSheet.create({
  page: {
    fontFamily: CV_FONT_FAMILY,
    fontSize: 10,
    lineHeight: 1.35,
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 40,
    color: "#1f2328",
  },
  header: { flexDirection: "row", marginBottom: 14 },
  photo: { width: 72, height: 72, borderRadius: 36, marginRight: 14, objectFit: "cover" },
  headerText: { flexGrow: 1, flexShrink: 1 },
  name: { fontSize: 20, fontWeight: 700, lineHeight: 1.2 },
  headline: { fontSize: 11, color: "#3d4450", marginTop: 2 },
  contact: { fontSize: 9, color: "#3d4450", marginTop: 4 },
  section: { marginTop: 10 },
  heading: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#1a4f8b",
    borderBottomWidth: 0.75,
    borderBottomColor: "#c9d3e0",
    paddingBottom: 2,
    marginBottom: 6,
  },
  entry: { marginBottom: 7 },
  entryHead: { flexDirection: "row", justifyContent: "space-between" },
  entryTitle: { fontWeight: 700, flexShrink: 1, paddingRight: 8 },
  entryDates: { fontSize: 9, color: "#3d4450", flexShrink: 0 },
  entrySubtitle: { fontStyle: "italic", color: "#3d4450" },
  bulletRow: { flexDirection: "row", marginTop: 1.5 },
  bulletMark: { width: 10 },
  bulletText: { flex: 1 },
  clause: { marginTop: 16, fontSize: 7.5, color: "#5b6270", lineHeight: 1.3 },
});

/**
 * The cv-snap CV template (A4). Pure presentation of a `CvModel`: every visible string comes from
 * the model, so the preview built from the same model shows the same content (FR-13). Text is
 * real text (selectable, ATS-readable), never an image.
 */
export function CvDocument({ model }: { model: CvModel }) {
  const isRtl = RTL_LANGUAGES.has(model.language);
  const align = isRtl ? ("right" as const) : ("left" as const);
  return (
    <Document title={`CV ${model.header.fullName}`} language={model.language} creator="cv-snap">
      <Page size="A4" style={[styles.page, { textAlign: align }]}>
        <View style={styles.header}>
          {model.header.photoDataUrl ? (
            <Image src={model.header.photoDataUrl} style={styles.photo} />
          ) : null}
          <View style={styles.headerText}>
            <Text style={styles.name}>{model.header.fullName}</Text>
            {model.header.headline ? (
              <Text style={styles.headline}>{model.header.headline}</Text>
            ) : null}
            {model.header.contactLines.length > 0 ? (
              <Text style={styles.contact}>{model.header.contactLines.join("  ·  ")}</Text>
            ) : null}
          </View>
        </View>

        {model.sections.map((section) => (
          <SectionView key={section.key} section={section} />
        ))}

        {model.clause ? (
          <Text style={styles.clause} wrap={false}>
            {model.clause}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}

function SectionView({ section }: { section: CvSection }) {
  return (
    <View style={styles.section}>
      {/* Keep a heading together with the start of its section. */}
      <Text style={styles.heading} minPresenceAhead={40}>
        {section.heading}
      </Text>
      {section.entries.map((entry) => (
        <EntryView key={entry.id} entry={entry} layout={section.layout} />
      ))}
    </View>
  );
}

function EntryView({ entry, layout }: { entry: CvEntry; layout: CvSection["layout"] }) {
  if (layout === "paragraph") return <Text>{entry.bullets.join(" ")}</Text>;
  if (layout === "inline") return <Text>{entry.bullets.join("  ·  ")}</Text>;
  return (
    <View style={styles.entry}>
      {entry.title || entry.dates ? (
        <View style={styles.entryHead} wrap={false}>
          <Text style={styles.entryTitle}>{entry.title ?? ""}</Text>
          {entry.dates ? <Text style={styles.entryDates}>{entry.dates}</Text> : null}
        </View>
      ) : null}
      {entry.subtitle ? <Text style={styles.entrySubtitle}>{entry.subtitle}</Text> : null}
      {entry.bullets.map((bullet, index) => (
        <View key={`${entry.id}-${String(index)}`} style={styles.bulletRow} wrap={false}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={styles.bulletText}>{bullet}</Text>
        </View>
      ))}
    </View>
  );
}
