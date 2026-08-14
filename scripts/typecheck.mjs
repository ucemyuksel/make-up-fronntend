/**
 * Tüm workspace'leri tip denetiminden geçirir.
 *
 *   npm run typecheck
 *
 * NEDEN GEREKLİ: bu depoda derleme adımı yalnızca çalıştırılan uygulamayı
 * kapsıyor. Backend'de tam olarak bu boşluk yüzünden bir servis derlenmez
 * hâle gelmiş ve fark edilmemişti — yalnız iki modül derleniyordu. Burada da
 * `dev:store` çalışırken `seller` bozuk olabilir ve kimse görmez.
 *
 * Ek dosya derlemez; her workspace'in kendi tsconfig'i ile `tsc --noEmit`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const kok = dirname(dirname(fileURLToPath(import.meta.url)));
// .bin/tsc.cmd DEGIL: execFile Windows'ta .cmd dosyasini kabuk olmadan
// calistiramiyor ve her workspace sessizce "FAIL" gorunuyordu. Derleyicinin
// kendi JS girisini Node ile calistirmak her platformda ayni davranir.
const tsc = join(kok, "node_modules", "typescript", "bin", "tsc");

if (!existsSync(tsc)) {
  console.error("typescript bulunamadi - once: npm install");
  process.exit(1);
}

const hedefler = [];
for (const grup of ["apps", "packages"]) {
  const dizin = join(kok, grup);
  if (!existsSync(dizin)) continue;
  for (const ad of readdirSync(dizin)) {
    if (existsSync(join(dizin, ad, "tsconfig.json"))) {
      hedefler.push(join(dizin, ad));
    }
  }
}

let hata = 0;
for (const hedef of hedefler) {
  const ad = hedef.slice(kok.length + 1);
  try {
    // --incremental false: tsconfig'de acik ve .tsbuildinfo YAZIYOR. Denetim
    // betiginin dosya birakmamasi gerekiyor - CI kaynagi salt-okunur baglayinca
    // yazma denemesi denetimi kod hatasi gibi gosterirdi.
    execFileSync(process.execPath, [tsc, "--noEmit", "--incremental", "false", "-p", "tsconfig.json"],
      { cwd: hedef, stdio: "pipe" });
    console.log(`  OK    ${ad}`);
  } catch (e) {
    hata++;
    console.log(`  FAIL  ${ad}`);
    // tsc hatalari stdout'a yazar, stderr'e degil. Ikisi de bossa (surec hic
    // baslamamis olabilir) hata mesajini gostermek sart - aksi halde "FAIL"
    // gorunur ama sebebi gorunmez.
    const cikti = String(e.stdout ?? "") + String(e.stderr ?? "") || String(e.message ?? "");
    for (const satir of cikti.split("\n").filter(Boolean).slice(0, 10)) {
      console.log("        " + satir);
    }
  }
}

console.log("");
if (hata === 0) {
  console.log(`Tip denetimi temiz (${hedefler.length} workspace).`);
} else {
  console.log(`${hata} workspace'te tip hatasi.`);
  process.exit(1);
}
