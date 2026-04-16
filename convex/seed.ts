import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

type MedicationSeed = Omit<
	Doc<"medications">,
	"_id" | "_creationTime" | "updatedAt" | "updatedBy"
>;
type ContactSeed = Omit<Doc<"contacts">, "_id" | "_creationTime">;
type EntitlementSeed = Omit<
	Doc<"entitlements">,
	"_id" | "_creationTime" | "updatedAt" | "updatedBy"
>;

const MEDICATIONS: MedicationSeed[] = [
	{
		name: "Kisqali (ribociclib)",
		dose: "3 töflur",
		schedule: "Á morgnana",
		purpose: "Krabbameinslyf (CDK4/6 hemlar) — brjóstakrabbamein",
		prescriber: "Óskar læknir, Brjóstamiðstöð Landspítala",
		notes: "Meginlyf í krabbameinsmeðferð.",
		isActive: true,
	},
	{
		name: "Eliquis (apixaban)",
		dose: "1 tafla tvisvar á dag",
		schedule: "Á morgnana og á kvöldin",
		purpose: "Blóðþynning",
		isActive: true,
	},
	{
		name: "WhiteEyes augndropa",
		dose: "2 dropar",
		schedule: "Á morgnana",
		purpose: "Augndropa",
		isActive: true,
	},
	{
		name: "Retina Clear",
		dose: "1 hylki",
		schedule: "Á morgnana",
		purpose: "Augnheilsa — vítamín/fæðubótarefni",
		notes: "60 hylki. Elin keypti.",
		isActive: true,
	},
	{
		name: "Andhormónalyf (sprauta)",
		dose: "Sprauta",
		schedule: "Á 2ja vikna fresti",
		purpose: "Andhormónameðferð — brjóstakrabbamein",
		prescriber: "Brjóstamiðstöð Landspítala",
		notes:
			"Gefin á Brjóstamiðstöð hingað til. Vonast til að fá heimahjúkrun til að sjá um þessar sprautur heima og taka blóðprufur — ekki komið í gang ennþá. Nákvæmt lyfjanafn óþekkt — athuga við Helgu.",
		isActive: true,
	},
];

const CONTACTS: ContactSeed[] = [
	// Neyð (emergency)
	{ category: "emergency", name: "Neyðarlína", phone: "112", sortOrder: 1 },
	{
		category: "emergency",
		name: "Eitrunarmiðstöð",
		phone: "543 2222",
		sortOrder: 2,
	},
	{
		category: "emergency",
		name: "Læknavaktin",
		phone: "1770",
		notes: "Utan dagvinnutíma",
		sortOrder: 3,
	},

	// Læknar og heilsugæsla (medical)
	{
		category: "medical",
		name: "Óskar læknir",
		role: "Brjóstamiðstöð Landspítala",
		phone: "543 9560",
		notes: "Eiríksgata 5, 3. hæð, 101 Rvk. Opið 9–15:30 virka daga.",
		sortOrder: 1,
	},
	{
		category: "medical",
		name: "Kolbrún",
		role: "Sogæðanuddari — Ljósið",
		phone: "561-3770",
		notes:
			"Guðrúnartún 1, 105 Rvk. Mán–fim 8:30–16, fös 8:30–14. ATH: Sigga er á biðlista í sogæðanudd.",
		sortOrder: 2,
	},
	{
		category: "medical",
		name: "Bati sjúkraþjálfun",
		role: "Sjúkraþjálfun — í forgangi á biðlista",
		phone: "553-1234",
		email: "bati@bati.is",
		notes:
			"Kringlan 7, 103 Rvk. Sigga er í forgangi á biðlista. Sérfræðingar í sogbjúgsmeðferð.",
		sortOrder: 3,
	},

	// Sveitarfélag og þjónusta (municipal)
	{
		category: "municipal",
		name: "Ljósið",
		role: "Endurhæfingar- og stuðningsmiðstöð",
		phone: "561-3770",
		notes:
			"ljosid.is — Krabbameinsmiðstöð. Sigga er nýbyrjuð. Viðtal við iðjuþjálfa 21. apríl, sjúkraþjálfara síðar. Á biðlista í sogæðanudd. Boðið upp á snyrtingu, stólaleikfimi, æfingar í tækjasal.",
		sortOrder: 1,
	},
	{
		category: "municipal",
		name: "Brjóstamiðstöð Landspítala",
		role: "Krabbameinsmeðferð",
		phone: "543 9560",
		email: "brjostaskimun@landspitali.is",
		notes:
			"Eiríksgata 5, 3. hæð. Gefur út vottorð fyrir heimahjúkrun og akstursþjónustu. Andhormónasprautur á 2ja vikna fresti.",
		sortOrder: 2,
	},
	{
		category: "municipal",
		name: "Sjúkratryggingar Íslands",
		role: "Heilsutryggingar",
		phone: "515 0000",
		sortOrder: 3,
	},
	{
		category: "municipal",
		name: "Tryggingastofnun (TR)",
		role: "Bætur og réttindi",
		phone: "560 4400",
		sortOrder: 4,
	},
	{
		category: "municipal",
		name: "Félagsþjónusta Kópavogs",
		role: "Sveitarfélagsþjónusta",
		notes: "Símanúmer vantar",
		sortOrder: 5,
	},
	{
		category: "municipal",
		name: "Virkni og Vellíðan (Kópavogur)",
		role: "Hreyfing og félagsstarf",
		email: "freydis.eiriksdottir@kopavogur.is",
		notes:
			"Freydís Eiríksdóttir, verkefnastjóri. Fífan, þri & fös kl. 9:15. Helga og Sigga skráðar. Hefur legið niðri eftir fall og rifbeinsbrot — áætlað að byrja aftur.",
		sortOrder: 6,
	},
	{
		category: "municipal",
		name: "Heimahjúkrun HH (Kópavogur)",
		role: "Heimahjúkrun — ókeypis",
		notes:
			"Heilsugæsla höfuðborgarsvæðisins. Þarf skriflega beiðni frá heilbrigðisstarfsmanni. heilsugaeslan.is",
		sortOrder: 7,
	},
	{
		category: "municipal",
		name: "Heimaþjónusta Kópavogs",
		role: "Félagsleg heimaþjónusta",
		email: "heimathjonusta@kopavogur.is",
		notes:
			"Símatímar þjónustustjóra: 10–11:30 virka daga. Bóka samtal á kopavogur.is.",
		sortOrder: 8,
	},
];

const ENTITLEMENTS: EntitlementSeed[] = [
	// Known — flagged by Elin
	{
		title: "Vottorð fyrir heimahjúkrun",
		description:
			"Vottorð/tilvísun frá Brjóstamiðstöð þarf til að fá heimahjúkrun.",
		status: "not_applied",
		appliedTo: "Brjóstamiðstöð Landspítala",
		notes:
			"BRÝNT: Heimahjúkrun þarf til að gefa andhormónasprautur heima (nú á 2ja vikna fresti á Brjóstamiðstöð) og taka blóðprufur. Helga segir að þetta sé ekki komið í gang ennþá.",
	},
	{
		title: "Vottorð fyrir akstursþjónustu fatlaðra",
		description:
			"Vottorð frá Brjóstamiðstöð þarf til að fá akstur til/frá meðferð.",
		status: "not_applied",
		appliedTo: "Brjóstamiðstöð Landspítala",
		notes:
			"Nauðsynlegt svo Sigga komist á tíma hjá læknum, Ljósinu, o.fl. Helga vill fá sem flest skipti.",
	},

	// Researched — Sjúkratryggingar Íslands
	{
		title: "Þrýstiermar og þrýstisokkar (sogæðabjúgur)",
		description:
			"SÍ greiðir fyrir 3 pör af þrýstisokkaum og 2 þrýstiermar á 12 mán. tímabili. Sérsaumaðir samþykktir fyrir sogæðabjúg stig II-III.",
		status: "not_applied",
		appliedTo: "Sjúkratryggingar Íslands — Hjálpartækjamiðstöð",
		notes:
			"Mjög líklega viðeigandi — Sigga fær sogæðanudd hjá Ljósinu og er á biðlista hjá Bati vegna sogæðabjúgsmeðferðar. Heilbrigðisstarfsmaður sendir umsókn. Sími SÍ: 515 0100.",
	},
	{
		title: "Lyfjakostnaður — þrepaskipt kerfi (aldraðir 67+)",
		description:
			"Hámarksgreiðsla er 41.000 kr. á 12 mán. tímabili. Kisqali er dýrt — mikilvægt að staðfesta að SÍ greiðsluþátttaka sé virk.",
		status: "not_applied",
		appliedTo: "Sjúkratryggingar Íslands",
		notes:
			"Ætti að vera sjálfvirkt en athuga hvort Kisqali-kostnaður fari í gegnum þetta kerfi eða sé sérstakt ferli.",
	},
	{
		title: "Ferðakostnaður vegna veikinda",
		description:
			"SÍ taka þátt í ferðakostnaði til/frá meðferð. Sækja þarf um endurgreiðslu.",
		status: "not_applied",
		appliedTo: "Sjúkratryggingar Íslands",
		notes:
			"Á við um ferðir til Ljósins, Brjóstamiðstöðvar, Bati. Eyðublöð á island.is/s/sjukratryggingar. Gæti dregið úr akstursálagi á fjölskylduna.",
	},
	{
		title: "Hárkollur / höfuðfatnaður (ef við á)",
		description:
			"SÍ greiðir allt að 188.000 kr. á 2 ára tímabili vegna hárkolls og höfuðfatnaðar eftir krabbameinsmeðferð.",
		status: "not_applied",
		appliedTo: "Sjúkratryggingar Íslands",
		notes:
			"Á aðeins við ef Sigga hefur hárlos vegna meðferðar. Athuga við Helgu.",
	},
	{
		title: "Gervibrjóst og brjóstahöld (ef við á)",
		description:
			"SÍ greiðir gervibrjóst (2 fyrsta árið, 1 eftir það) og sérstyrkt brjóstahöld eftir brjóstnám.",
		status: "not_applied",
		appliedTo: "Sjúkratryggingar Íslands",
		notes: "Á aðeins við ef brjóstnám. Athuga við Helgu.",
	},
	{
		title: "Hjálpartæki — handleggsstuðningur / önnur tæki",
		description:
			"SÍ Hjálpartækjamiðstöð: Heilbrigðisstarfsmaður metur þörf og sendir umsókn. Sækja ÁÐUR en keypt er.",
		status: "not_applied",
		appliedTo: "Sjúkratryggingar Íslands — Hjálpartækjamiðstöð (s. 515 0100)",
		notes:
			"Nefnt í upprunalegu fjölskylduspjalli. Helga sem sjúkraþjálfari getur sent umsókn. Afgreiðslutími: nokkrar vikur.",
	},

	// Researched — Kópavogur sveitarfélag
	{
		title: "Heimaþjónusta Kópavogs",
		description:
			"Stuðningsþjónusta heima: aðstoð við athafnir daglegs lífs, heimilishald, öryggisviðvera.",
		status: "not_applied",
		appliedTo: "Kópavogur — Velferðarsvið",
		notes:
			"Netfang: heimathjonusta@kopavogur.is. Símatímar: 10–11:30 virka daga. Bóka samtal á kopavogur.is. ATH: biðlistar geta verið langir.",
	},
	{
		title: "Heimsendur matur (Kópavogur)",
		description: "Heimsendur matur fyrir eldri borgara frá Kópavogsbæ.",
		status: "not_applied",
		appliedTo: "Kópavogur — Velferðarsvið",
		notes: "Upplýsingar á kopavogur.is/ibuar/aldradir.",
	},

	// Researched — Heilsugæslan
	{
		title: "Heimahjúkrun HH (Kópavogur)",
		description:
			"Heimahjúkrun ókeypis: lyfjaeftirlit, sérhæfð hjúkrun, heildræn meðferð. Þarf skriflega beiðni frá heilbrigðisstarfsmanni.",
		status: "not_applied",
		appliedTo: "Heilsugæsla höfuðborgarsvæðisins — Heimahjúkrun HH",
		notes:
			"Beiðni sendist rafrænt í Sögu frá heilbrigðisstarfsmanni. Tengist vottorðinu frá Brjóstamiðstöð. Gæti verið lykilþjónusta ef ástand versnar.",
	},
];

export const run = internalMutation({
	args: { userId: v.optional(v.id("users")) },
	handler: async (ctx, args) => {
		let userId: Id<"users">;
		if (args.userId) {
			const user = await ctx.db.get(args.userId);
			if (!user) {
				throw new ConvexError(`Notandi með ID ${args.userId} fannst ekki.`);
			}
			userId = user._id;
		} else {
			const firstUser = await ctx.db.query("users").first();
			if (!firstUser) {
				throw new ConvexError(
					"Enginn notandi til. Skráðu þig inn í gegnum /login fyrst og keyrðu svo aftur.",
				);
			}
			userId = firstUser._id;
		}

		const existingMedication = await ctx.db.query("medications").first();
		const existingContact = await ctx.db.query("contacts").first();
		const existingEntitlement = await ctx.db.query("entitlements").first();
		if (existingMedication || existingContact || existingEntitlement) {
			return {
				seeded: false,
				reason: "Gögn þegar til staðar — sleppi seed.",
			};
		}

		const now = Date.now();

		for (const med of MEDICATIONS) {
			await ctx.db.insert("medications", {
				...med,
				updatedAt: now,
				updatedBy: userId,
			});
		}
		for (const contact of CONTACTS) {
			await ctx.db.insert("contacts", contact);
		}
		for (const entitlement of ENTITLEMENTS) {
			await ctx.db.insert("entitlements", {
				...entitlement,
				updatedAt: now,
				updatedBy: userId,
			});
		}

		return {
			seeded: true,
			medications: MEDICATIONS.length,
			contacts: CONTACTS.length,
			entitlements: ENTITLEMENTS.length,
		};
	},
});
