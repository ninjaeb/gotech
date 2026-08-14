import "dotenv/config";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/db";

// One-time backfill for the ~200 contacts imported from the Xchievers #815
// participant list (see import-v2.sql / update-photos.sql). Their photoUrl
// currently points at Xchievers' own CDN (cdn-ticket.xchievers.com) or is
// unset — this downloads each one ONCE, saves it under
// public/uploads/contacts/ on THIS machine, and points photoUrl at that
// local file instead, so the photo keeps working even if Xchievers' CDN
// ever goes away. Uses public/uploads/ (gitignored) rather than a data:
// URL in the database, since these are real downloaded files, not
// something a form upload produced in-memory.
//
// Must run somewhere with both real internet access and the real
// DATABASE_URL — neither is true of the sandbox this was written in, hence
// a script to run yourself rather than something already applied for you.
// Run this ONCE, from the app's root directory on the actual server:
//
//   npx tsx scripts/download-xchievers-photos.ts
//
// Safe to re-run: skips any image already downloaded, and only touches a
// contact's photoUrl if it's still empty or still the exact Xchievers CDN
// link this script would set it to — so it won't clobber a photo you've
// since replaced through the app itself.

const OUTPUT_DIR = path.join(process.cwd(), "public", "uploads", "contacts");
const REQUEST_DELAY_MS = 200;
const FETCH_TIMEOUT_MS = 15_000;

const PHOTOS: { profileUrl: string; imageUrl: string }[] = [
  { profileUrl: "https://xchievers.com/815/participants/joseph.lee", imageUrl: "https://cdn-ticket.xchievers.com/avatars/eXsluvXIUqYA2DXy8phAiQQjO6tHmDtv/da2671e1-3186-4a10-ae84-c223a02bb91e.jpeg" },
  { profileUrl: "https://xchievers.com/815/participants/adrian.swea", imageUrl: "https://cdn-ticket.xchievers.com/avatars/VPSl2jjY9FEcTliq1PH63y7dunByoWFS/49d612b5-d235-4641-864a-7033a44ecc26.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/sheuexin", imageUrl: "https://cdn-ticket.xchievers.com/avatars/cwsDL6F2KZoXd4R3HwKeRGuavSUT0g8r/792c4d8a-1d49-4605-8483-351c84a6dc67.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/DKP1MGXp4y5P2GYXvtMDxsyHGlQHy0jg", imageUrl: "https://cdn-ticket.xchievers.com/avatars/DKP1MGXp4y5P2GYXvtMDxsyHGlQHy0jg/bdf7af32-7538-415b-8c93-34209f57a829.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/G5HWobSwLMtgnCqD2ZTTBg2iCTErURSq", imageUrl: "https://cdn-ticket.xchievers.com/avatars/G5HWobSwLMtgnCqD2ZTTBg2iCTErURSq/1f3a3d94-639d-42c5-8049-d49e0a4ec893.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/yaqing", imageUrl: "https://cdn-ticket.xchievers.com/avatars/WEIb116kSxmL7jgMLxxWWBkHbekoytLA/e1f0a59c-e80a-4cf4-8dc9-31d26a0e5d7a.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/hrhelen", imageUrl: "https://cdn-ticket.xchievers.com/avatars/uvdyPfcUpozzhIrIQ2NXE0BNVx096hkP/862a7e56-d389-4415-aad0-530984875b20.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/xandra.yeoh", imageUrl: "https://cdn-ticket.xchievers.com/avatars/cMOkH8FuUp1L01fIcfFRfojMBXrCH5D6/fad57a6f-3212-4c70-a619-640a1d5dc5ef.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/16saCXz1RzKdLPWuOhMafdQQY5tjlrli", imageUrl: "https://cdn-ticket.xchievers.com/avatars/16saCXz1RzKdLPWuOhMafdQQY5tjlrli/11937f46-012a-4f0e-96ac-e847150c450f.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/skyler", imageUrl: "https://cdn-ticket.xchievers.com/avatars/2o6Lf5ZORiwWP2l0fapJ6l95PAXhMoRV/a94b8335-bf24-4b72-ab8d-81289135ef57.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/kelvin.ooi", imageUrl: "https://cdn-ticket.xchievers.com/avatars/JXVuXCI2dvSsNdebOGMYR8PpVCzqDLNi/9aa14412-eb1e-499d-a6da-41891eacb3a0.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/roymun", imageUrl: "https://cdn-ticket.xchievers.com/avatars/VqTISwOG5oOy2pYIzxqOONP3MqhkBGSa/b80a2918-cc37-4c31-ac72-d6a2ab74e972.png" },
  { profileUrl: "https://xchievers.com/815/participants/Llk3pLgB0c3aoT0AjSYq0fp7RXI8JJhw", imageUrl: "https://cdn-ticket.xchievers.com/avatars/Llk3pLgB0c3aoT0AjSYq0fp7RXI8JJhw/bfeb74ff-7a90-4e44-94b5-255b436514f4.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/clarence", imageUrl: "https://cdn-ticket.xchievers.com/avatars/fR0cIq4tELYH58tVEffzDiJgvBMtYiXp/f686371d-671e-41cd-8c71-6fc9a706522b.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/cGUiScuC47W60NqJIuRGZ18BDU2GOMvb", imageUrl: "https://cdn-ticket.xchievers.com/avatars/cGUiScuC47W60NqJIuRGZ18BDU2GOMvb/1e058f9b-53bf-4e8c-a263-28bc2f307e58.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/kit9o", imageUrl: "https://cdn-ticket.xchievers.com/avatars/zv5zNLVXZHyBdRxWKonZ2X45GLxrTwOf/7c382c0e-b194-49bf-8e8d-e9978db4812a.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/peixin", imageUrl: "https://cdn-ticket.xchievers.com/avatars/4g86O5lxDwcQ4NPz0rIhgOixnRaKkMPx/d8d8a9f6-e807-416a-a913-febebd9251a5.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/XPkslrdkcZBFFrg3F95LI8mBS4R0ufTz", imageUrl: "https://cdn-ticket.xchievers.com/avatars/XPkslrdkcZBFFrg3F95LI8mBS4R0ufTz/135bd030-6bd5-4a32-9f30-d750e4c2d3ff.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/HImMkuPUy92xvs7hMYNftIK2V1xjhNTg", imageUrl: "https://cdn-ticket.xchievers.com/avatars/HImMkuPUy92xvs7hMYNftIK2V1xjhNTg/a7f517c6-d3d0-4f3b-9006-b99d227bf8d9.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/dsIHcmLGurmgpPrZzM6682sWNQke5QfA", imageUrl: "https://cdn-ticket.xchievers.com/avatars/dsIHcmLGurmgpPrZzM6682sWNQke5QfA/9cac2d3e-6974-4c48-b012-36078196a261.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/RcTYUIP0pcRw3s7hWG0nFfZt7Cs6xJAU", imageUrl: "https://cdn-ticket.xchievers.com/avatars/RcTYUIP0pcRw3s7hWG0nFfZt7Cs6xJAU/f97096fe-a6b7-4bc9-a7f2-c174b2bd4bc9.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/8LKRWxE1sZ8OmGicThZcxQAqZ91pRExs", imageUrl: "https://cdn-ticket.xchievers.com/avatars/8LKRWxE1sZ8OmGicThZcxQAqZ91pRExs/3fa432d1-91f2-4054-9935-5ce057729171.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/94801DMEExrN9Uyit7Xh1GGpkCLyFtY4", imageUrl: "https://cdn-ticket.xchievers.com/avatars/94801DMEExrN9Uyit7Xh1GGpkCLyFtY4/f0fe5f79-292a-42fb-b9a7-09307bfe3d1b.png" },
  { profileUrl: "https://xchievers.com/815/participants/yoky-soark", imageUrl: "https://cdn-ticket.xchievers.com/avatars/jJi1nnwekGPq04AE0xJJlcokLeBS9wzQ/d6dd8cc1-7d5f-4393-be09-8bb86f064212.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/ronling", imageUrl: "https://cdn-ticket.xchievers.com/avatars/BNCvGbmFCbmKIpoxL6UAgRbYLGNdZpQs/62b7add6-95b9-45dc-b5fc-c18cdfecb81a.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/l0Smf1x9v7BZSI4U7Bg0n6I5UKQomyw7", imageUrl: "https://cdn-ticket.xchievers.com/avatars/l0Smf1x9v7BZSI4U7Bg0n6I5UKQomyw7/e1e1a476-2332-43a2-ae3f-ea94eae1d3d5.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/3Php8fabTJnMa7OyFCWaABYeBcsBumOa", imageUrl: "https://cdn-ticket.xchievers.com/avatars/3Php8fabTJnMa7OyFCWaABYeBcsBumOa/2b28bc1f-52c2-4de3-a079-dbd7b7c289be.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/KklJzkBwwDdDdhIxOBEm8XaW3SkWbsLr", imageUrl: "https://cdn-ticket.xchievers.com/avatars/KklJzkBwwDdDdhIxOBEm8XaW3SkWbsLr/337b78ed-e42b-49fd-91ec-fbed99ea0d68.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/JfLnLifTi991lGijflNcLpoGhnPpskqz", imageUrl: "https://cdn-ticket.xchievers.com/avatars/JfLnLifTi991lGijflNcLpoGhnPpskqz/fa4fd21a-7e57-4cb9-9676-161bc501ffe3.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/sophiamaytan", imageUrl: "https://cdn-ticket.xchievers.com/avatars/H3y9hQ0eIYEZ3AHL3UBWuDwQW62yr40b/aac5b9dd-baeb-4750-b3cf-852f4caa24d7.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/trischoyvinjo", imageUrl: "https://cdn-ticket.xchievers.com/avatars/JDG5OTCOHvKILYEAwzFESmA5vCfCt7VQ/cb40bb70-4f52-4995-be28-74ad8a758f67.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/6ylHtAb8WvtPs1PBpgX0CSECPrh8dipO", imageUrl: "https://cdn-ticket.xchievers.com/avatars/6ylHtAb8WvtPs1PBpgX0CSECPrh8dipO/784a626d-2218-4b43-b2c8-be6df9d77f63.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/victoriakiwacert", imageUrl: "https://cdn-ticket.xchievers.com/avatars/8RRdRzjHXXR1KOL2ZFuMrsnKslNOJRql/7b62a8ee-a7f4-4cc4-a61c-9817f52fa16e.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/hannsenlee", imageUrl: "https://cdn-ticket.xchievers.com/avatars/sjRGYmxZUpezvW7mT8Oit9D0T17ngBTa/59ab051b-ba56-4103-8b92-3870510006b0.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/fionneseahfcmma", imageUrl: "https://cdn-ticket.xchievers.com/avatars/HvV3dH2g2uhEuOorpq65loN4iOBn0RAO/a816bcff-92f1-4f66-9f44-a10cf8c5589b.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/jaydan", imageUrl: "https://cdn-ticket.xchievers.com/avatars/ApCvu09pj8i8Z3vIIg5PrGvLqlBwdIbb/e72a9fe5-8c80-4d00-8df7-3db5ef1e116a.png" },
  { profileUrl: "https://xchievers.com/815/participants/gohjielong", imageUrl: "https://cdn-ticket.xchievers.com/avatars/gwD12ePW9IjRDoXnXGYxjhZJZIoishrf/b4094030-fa35-4240-aecc-416d27e124cb.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/wesleyong", imageUrl: "https://cdn-ticket.xchievers.com/avatars/mpZMtSNbNgjKxTL2jlNJZHD2HOHojjrE/b2388965-b797-486d-8f96-86aa501e0888.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/kCi58w2d5hsStMljF2eZl07SlNcD99rB", imageUrl: "https://cdn-ticket.xchievers.com/avatars/kCi58w2d5hsStMljF2eZl07SlNcD99rB/1b238359-ddf2-4fe1-9e4c-137aa8685fd2.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/susanlaw", imageUrl: "https://cdn-ticket.xchievers.com/avatars/Fa3J2vuELZPBcufWm4JeJom3ZLSiN8AH/2c629ae6-6492-47a2-b5c1-3bfea70c76b0.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/keegansoh", imageUrl: "https://cdn-ticket.xchievers.com/avatars/m3zIGmdfgcQGF2ByiWaIyHSm56kfTXn7/a5accc63-c669-4697-bc55-d0e1a7aa441d.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/vinjojoanne", imageUrl: "https://cdn-ticket.xchievers.com/avatars/R69acoc7XaNHZTrgCq7xySzry5RzoDeN/50943670-b9d1-4abb-a664-ac0ccf175b4d.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/justinekong", imageUrl: "https://cdn-ticket.xchievers.com/avatars/PD3zg1jGcE0fkiSoU4SevZyderPoXhqx/362d8b0d-3c23-460f-b9ef-932f36227313.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/206wSOPMklv4oxLO71HFQe1qZ9RIsR3R", imageUrl: "https://cdn-ticket.xchievers.com/avatars/206wSOPMklv4oxLO71HFQe1qZ9RIsR3R/eb40ceb5-ea84-4d51-955f-1c5560d2db21.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/1tIY7I78sSlhfcbVqrRWeKhwXVjZmowW", imageUrl: "https://cdn-ticket.xchievers.com/avatars/1tIY7I78sSlhfcbVqrRWeKhwXVjZmowW/7be2b09a-623a-4372-b956-6bcf4378530b.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/hugooc66", imageUrl: "https://cdn-ticket.xchievers.com/avatars/M8YFB6Scz6XSo87oOCKSRBDDGfiaC3V1/bb504452-5a31-475c-86d2-10db8a58fd5b.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/nianfoong", imageUrl: "https://cdn-ticket.xchievers.com/avatars/yfun4d3vT6J9KWHfXW7imbBKWSU8ZFAQ/d493774e-801e-4b30-bd42-705c4be9bad5.png" },
  { profileUrl: "https://xchievers.com/815/participants/jFnYanCLATjfmkfKPS5V4rwLnQgyNHkm", imageUrl: "https://cdn-ticket.xchievers.com/avatars/jFnYanCLATjfmkfKPS5V4rwLnQgyNHkm/43ba33cd-5757-46a0-85e6-a4a61ec996b1.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/ivan", imageUrl: "https://cdn-ticket.xchievers.com/avatars/maKTelgIDsrxwrAAElhiy2FLzWoLNojP/458d9703-6539-4ab0-8cdc-ee6f2458b575.png" },
  { profileUrl: "https://xchievers.com/815/participants/exU09o2K2mbFClldJThEDaPy3vNZ5hQb", imageUrl: "https://cdn-ticket.xchievers.com/avatars/exU09o2K2mbFClldJThEDaPy3vNZ5hQb/aea7f646-2455-4301-9a43-c72e369eafe2.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/dr_wenxichoo", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/PScCDMtw0rWXMWTxR6Pk7LgyGVyVFxlJ/1f0aa535-6101-4bd9-8d19-95283a2a32be.png" },
  { profileUrl: "https://xchievers.com/815/participants/derick", imageUrl: "https://cdn-ticket.xchievers.com/avatars/KGIwr6xTN8aqPvuSCu49SH1j2xa5Itxe/77b1ca50-dc99-4ad1-92df-8973a5faf961.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/jeffling", imageUrl: "https://cdn-ticket.xchievers.com/avatars/jD7IugC2o27ywbHkDGu89Qv89VJiq0f2/760c2fb3-0597-40ce-9561-2c85f3267830.png" },
  { profileUrl: "https://xchievers.com/815/participants/ophelia", imageUrl: "https://cdn-ticket.xchievers.com/avatars/ZXYXIrILpKswe4ykKcqX8qsyv58nNiTo/6cd36a35-28cc-49cc-9329-30fc15f94b2b.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/bryankok", imageUrl: "https://cdn-ticket.xchievers.com/avatars/je7w2p5CLeMQBPstjIwUglgO97nP2p5H/89b8c532-9f10-4671-b4c3-b2bfbe04e555.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/jjfong", imageUrl: "https://cdn-ticket.xchievers.com/avatars/glCxriv8nUXBbVnkr6MPprVsJlcnqRPT/187c9043-a37a-434e-9a11-bc648a04fbc7.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/jessonbinoedutour", imageUrl: "https://cdn-ticket.xchievers.com/avatars/JcJN5v6b5uPEaewnYd1WaLuKNsQ74Qvm/4b087279-415e-43a8-b1a4-f3cc4db0af1f.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/joshuachan317", imageUrl: "https://cdn-ticket.xchievers.com/avatars/OXACWsdmrVDfIoQg0JzT2aDQWKGZx9El/e43a4a9c-816a-41f5-92bd-d40c46ca22a6.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/simonai94134", imageUrl: "https://cdn-ticket.xchievers.com/avatars/B0jgG7O8loqa29YlElWb5SKL6QWdYcko/39b5b72e-4158-4a40-8547-0b939d9c0fba.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/normansoo", imageUrl: "https://cdn-ticket.xchievers.com/avatars/71YnGQQEhzycoW9l5x3AwcACmHXTzYMI/947786a5-1049-4aa3-8135-2a0e58294703.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/tracylee", imageUrl: "https://cdn-ticket.xchievers.com/avatars/lE4yXTPPA1ZENIniSppfP0ZcyP29YXT4/13f24579-4573-42ff-9053-07dbdadc1d40.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/EYHSVUmxFKVYHEdyY6sFKTb29aB262bh", imageUrl: "https://cdn-ticket.xchievers.com/avatars/EYHSVUmxFKVYHEdyY6sFKTb29aB262bh/8ecddff5-6901-44dd-abc7-5614f08c4a79.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/g52CK4JS7QUhZXM2EapnPNBRJZPJWEJU", imageUrl: "https://cdn-ticket.xchievers.com/avatars/g52CK4JS7QUhZXM2EapnPNBRJZPJWEJU/ee6d5f3f-d2b0-44ab-884f-6110ab72ff3f.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/alanou", imageUrl: "https://cdn-ticket.xchievers.com/avatars/9F8XEmFQ1mGvXhSdzgtHMZiECegmVcCV/12249000-1a54-4a12-93b1-c363acf8bdb1.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/berylsim", imageUrl: "https://cdn-ticket.xchievers.com/avatars/7ytU7rPOVyoqnXHIJSq3Hzk70VHsdpWe/bf229fcb-d0ed-4d93-b6c5-591d1f0aa001.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/Xx6rK928iIX0gHJwFHglYM0TtNGgLUpA", imageUrl: "https://cdn-ticket.xchievers.com/avatars/Xx6rK928iIX0gHJwFHglYM0TtNGgLUpA/0824bfb7-c4e0-4437-8c0d-868eb6e70e42.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/FfcoAYUPcol8rdxHhHn576Nk4vki1ZNL", imageUrl: "https://cdn-ticket.xchievers.com/avatars/FfcoAYUPcol8rdxHhHn576Nk4vki1ZNL/a5331e1d-fb5c-4fe0-a69f-6e363e1e10f2.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/xmBrhQRgHJmQKbVpiwzctzLPoQARGLWr", imageUrl: "https://cdn-ticket.xchievers.com/avatars/xmBrhQRgHJmQKbVpiwzctzLPoQARGLWr/df6762de-0fb9-41c7-92c1-70709973b52c.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/nrXoJ8ejoEFCQ46CZAivTtNFlLkYJyGs", imageUrl: "https://cdn-ticket.xchievers.com/avatars/nrXoJ8ejoEFCQ46CZAivTtNFlLkYJyGs/b22d5573-1569-4dd7-80a7-2033f7fc4ddf.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/wIZ3OzkOt9nHdz0DHNke5mQU7VgMFFoR", imageUrl: "https://cdn-ticket.xchievers.com/avatars/wIZ3OzkOt9nHdz0DHNke5mQU7VgMFFoR/2aaa54ed-17b2-43f9-b314-dafeec669461.webp" },
  { profileUrl: "https://xchievers.com/815/participants/bni", imageUrl: "https://cdn-ticket.xchievers.com/avatars/4BAvoxMrpXjI8paoQ6oD4quJK4wk9YnW/01bdfd91-feb9-48ea-bb85-ba669e261924.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/joying", imageUrl: "https://cdn-ticket.xchievers.com/avatars/99KLLOIMG4Fi67dSpDxYZWBh7WRCFrhm/eeedd318-0b77-4a7b-9253-3394b6e4b893.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/flexsoftware", imageUrl: "https://cdn-ticket.xchievers.com/avatars/ivkoKkXyDXp8htlRmHuYKybvN69szkr7/1a3c2a3e-e8b1-41f1-9888-826df953d047.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/ksyong", imageUrl: "https://cdn-ticket.xchievers.com/avatars/ivKjbF3SN0R4ykra4aqNn93bFjQ9ADsJ/50e63d1c-7526-4562-90ec-cd5d207e0162.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/onn", imageUrl: "https://cdn-ticket.xchievers.com/avatars/d6xrbthEyyCi1sAye0kNt08ZwyibLs20/5329c238-44b8-4f22-9e94-9b6d7c2cde37.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/realsimson", imageUrl: "https://cdn-ticket.xchievers.com/avatars/rXVDDWjXR7MqCtiuLyPxKSuapCFlZ9iq/939a785d-6aba-40c3-949f-1fab9d117acc.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/eugeneboon", imageUrl: "https://cdn-ticket.xchievers.com/avatars/yi5Aq5otG1M9rIjtumYkuXvAosVKPh4J/5888b79d-0718-45bd-82f5-73338bd327a6.png" },
  { profileUrl: "https://xchievers.com/815/participants/not", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/VEScWpg8MIhTGuCufOpPl7DGKJlZJd53/98c40742-d788-478c-9eab-dcc992006ed9.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/psptung", imageUrl: "https://cdn-ticket.xchievers.com/avatars/92iIXTWQaCcYu0ZFgqRY5pLXO4haPOAf/c4b9d95a-6a7e-4340-aaa4-cc0c2719a486.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/celine.loh", imageUrl: "https://cdn-ticket.xchievers.com/avatars/RwQulQKAhkzi4Ehku1NpnB2cMJv3HeWm/f631c2a0-09b4-401f-b1ed-9d7fedf0e758.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/dOcjmLOAEFo4WF1nDbq1KFupb5R4dGZA", imageUrl: "https://cdn-ticket.xchievers.com/avatars/dOcjmLOAEFo4WF1nDbq1KFupb5R4dGZA/4573f21b-8740-4c74-9a67-d9df424383d7.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/yeezhengyip", imageUrl: "https://cdn-ticket.xchievers.com/avatars/S19J9l0ulsHKEr2gKGrX9nAOROtH544v/cb3dbd4d-6075-4f94-aefb-071c8b7bb7ec.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/kabytan", imageUrl: "https://cdn-ticket.xchievers.com/avatars/X98RPR5c2QmBy8CPvdEBi3lUvamWURzG/e37ac2f4-91aa-4dc0-8a16-b0c34fb49752.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/tracychee", imageUrl: "https://cdn-ticket.xchievers.com/avatars/OAdJYrIF1FFYIvcmryyUQ7AVmtGz9LV2/b906ee78-04da-4df8-a818-68b87a1d7541.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/Vl231dU97dnfovFb0WFJG4Oody8gnHrs", imageUrl: "https://cdn-ticket.xchievers.com/avatars/Vl231dU97dnfovFb0WFJG4Oody8gnHrs/237f3f4a-1a65-4848-923c-1cb7724ee6cd.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/jesswong19", imageUrl: "https://cdn-ticket.xchievers.com/avatars/drkt7kg8GxtFZxXNzYDNse06J4VLs3Ad/2bdb3f66-e06a-4351-a7a1-8922f56be12d.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/dIguSg7Knjk3cuXyv6girumdNeTVzJMN", imageUrl: "https://cdn-ticket.xchievers.com/avatars/dIguSg7Knjk3cuXyv6girumdNeTVzJMN/c0477ffe-93d0-4913-8273-da64b92bbfd3.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/jcong99", imageUrl: "https://cdn-ticket.xchievers.com/avatars/uDpNDxXqcd729z24CRRQAm9cKEBXfa70/d892e544-ba85-4dbc-9b2b-1989c5d34ce2.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/resort-de-wellness-about-us", imageUrl: "https://cdn-ticket.xchievers.com/avatars/IlPpPd7dZ5gF5t5BTYgNYKQDdIlrYBLw/44c6afd6-8ee0-4ad9-b5b8-40f66827462c.png" },
  { profileUrl: "https://xchievers.com/815/participants/klZankdYiDVMReIdFsRbMz4No1OzSJuw", imageUrl: "https://cdn-ticket.xchievers.com/avatars/klZankdYiDVMReIdFsRbMz4No1OzSJuw/29b06e96-a21d-4938-8ec0-4933fdce1f6f.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/saejunn", imageUrl: "https://cdn-ticket.xchievers.com/avatars/t0sGyOJEd91nYPtkiSTmbYROQUvNXffu/ddfb9694-461a-4b66-ac27-675b57ec0b38.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/jdDQo6JyZmj6nABnnTOqjZ9DDgLJeTC6", imageUrl: "https://cdn-ticket.xchievers.com/avatars/jdDQo6JyZmj6nABnnTOqjZ9DDgLJeTC6/e0e20b4a-dc7c-47cd-a725-9161ff95b182.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/daarenovation", imageUrl: "https://cdn-ticket.xchievers.com/avatars/eOR2i7Uh8JqVcwCUylh7SdCDHwIR6U0e/0fb6ca25-64d0-4314-8fe6-419136739f66.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/H3gVpQVsSJB2HlqCIqQA5wy1hTydqsSz", imageUrl: "https://cdn-ticket.xchievers.com/avatars/H3gVpQVsSJB2HlqCIqQA5wy1hTydqsSz/0a761810-cc87-43c4-9c8f-1ba114f0b0f4.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/pG4klR2LkR67cdVcim1Ec6iw9XBmBOFf", imageUrl: "https://cdn-ticket.xchievers.com/avatars/pG4klR2LkR67cdVcim1Ec6iw9XBmBOFf/240d9b54-7513-482a-ac32-05c942ad4794.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/zhiying", imageUrl: "https://cdn-ticket.xchievers.com/avatars/DYFDttfNYX2iExUGVf1Q3Mm1SRtodmQk/9cc005d0-f4e7-4cbd-92ba-271a745c12c7.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/gwee", imageUrl: "https://cdn-ticket.xchievers.com/avatars/kfr2Hrof8pE0KOT0ZaDU7XG2Ry1E3CeT/afceaead-0a47-4073-8b08-61aebff0d52c.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/3YOoOseaq5GNeMWW4CcLUyhatyqWpavi", imageUrl: "https://cdn-ticket.xchievers.com/avatars/3YOoOseaq5GNeMWW4CcLUyhatyqWpavi/e5aa0766-c4c0-4473-8ef1-4bc482bdb844.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/nigel-chong", imageUrl: "https://cdn-ticket.xchievers.com/avatars/hnZKsc2Zd23XapjAfIfGor0fAm4YPA7p/97dafd20-5574-45dd-9ede-c08ae41147a2.png" },
  { profileUrl: "https://xchievers.com/815/participants/jasonchan_genesis", imageUrl: "https://cdn-ticket.xchievers.com/avatars/FtBlNhzybIyq7lxIt21kaQAlvi9yG7HL/d048c64c-a8d8-4578-8b9d-6feb109cac7b.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/shawnykw", imageUrl: "https://cdn-ticket.xchievers.com/avatars/8DLMs8ewdcGG8L8Ht4ThGgWTwu2YsoCB/d141db13-5a6e-4dbe-a473-223402ac6a1f.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/sherminlee", imageUrl: "https://cdn-ticket.xchievers.com/avatars/8SOGXwQu2ZXJaAbgSQFdPYBNJErvq4s8/92ba93a3-6f9f-4642-b52a-08dc51df17e9.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/4q4sa9EMQENDDGqToR2JD7to768vCZVb", imageUrl: "https://cdn-ticket.xchievers.com/avatars/4q4sa9EMQENDDGqToR2JD7to768vCZVb/2aa40e8f-93c7-4c44-b39d-823d5e960e69.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/WaWOPcpAyXWVOjcJZCMGXalRSDiTx6iJ", imageUrl: "https://cdn-ticket.xchievers.com/avatars/WaWOPcpAyXWVOjcJZCMGXalRSDiTx6iJ/75f6574a-16fc-4ff4-951c-47cc808179b0.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/r2lmIQj3LXgoln6kXynTP0eLebO1nEOL", imageUrl: "https://cdn-ticket.xchievers.com/avatars/r2lmIQj3LXgoln6kXynTP0eLebO1nEOL/39a90bf2-6da4-4a91-bb45-a783424d3278.png" },
  { profileUrl: "https://xchievers.com/815/participants/RazusZjUYLObQu4FdAojDtDTRlNXvkUW", imageUrl: "https://cdn-ticket.xchievers.com/avatars/RazusZjUYLObQu4FdAojDtDTRlNXvkUW/70fdb8a8-bf2b-4a92-968d-5d26c89eb470.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/WWVxnzjg7DgQFO6dkXaA4pzNPCNBmmy4", imageUrl: "https://cdn-ticket.xchievers.com/avatars/WWVxnzjg7DgQFO6dkXaA4pzNPCNBmmy4/73475ee9-71df-46a3-9b93-82c546a26f96.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/gino", imageUrl: "https://cdn-ticket.xchievers.com/avatars/z67lgdWYmaa1rzWeKYFckOHuvQgudZmm/532c4079-ddef-4f3a-bd07-37dc65495e5a.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/sabrinalim25", imageUrl: "https://cdn-ticket.xchievers.com/avatars/LTfiddO8cxI0u882QlpcfJrkWngCQ7kw/3016ce64-5b93-4c59-9cde-974297376d91.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/3fQ0M9Eo8FKPUC55nwdzBmPJZgYQXyFo", imageUrl: "https://cdn-ticket.xchievers.com/avatars/3fQ0M9Eo8FKPUC55nwdzBmPJZgYQXyFo/44dd8b69-e483-4a3c-ab02-860b627fb37f.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/jonahsia", imageUrl: "https://cdn-ticket.xchievers.com/avatars/sM9xNbHWuIZyLfU0zmOI0hN5n0021SQL/8fa18a83-7851-4bf3-99a2-f4f87dcaa8b8.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/6UslCCFwq3oZEA2ouoflJQH68J4avnAB", imageUrl: "https://cdn-ticket.xchievers.com/avatars/6UslCCFwq3oZEA2ouoflJQH68J4avnAB/88067c2d-e599-488a-af26-c2baf2cdf0cd.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/ijZcW8PYIyEE00CLFje3T2bKlAOZlLQl", imageUrl: "https://cdn-ticket.xchievers.com/avatars/ijZcW8PYIyEE00CLFje3T2bKlAOZlLQl/66819ea5-c312-4985-b932-3d3435457ba7.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/jacktan", imageUrl: "https://cdn-ticket.xchievers.com/avatars/yAJL2FIETCb1j9g1I6BKBdU12rERuG0E/309848af-2fe4-4618-a10d-f2f1f2071346.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/hYSzizhZiQRy7P0wAWcyfeRYSmlHuCpw", imageUrl: "https://cdn-ticket.xchievers.com/avatars/hYSzizhZiQRy7P0wAWcyfeRYSmlHuCpw/c598ef7c-db79-42b1-9495-3204281b015a.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/msyue", imageUrl: "https://cdn-ticket.xchievers.com/avatars/jYr7QcE3VkB8lzdghLbsalcAUBXCsmzf/5ee83bf5-44fe-4359-bb8f-17f975bb1d2b.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/janiceteh", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/nEqEDTUAAkoxvx39GMGVrnpDti68cm3q/a22a0a85-babe-4745-9fa8-36ebf537e58c.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/nzXfflgZi04p3zxdXGP2ZKLMo7Qx60sV", imageUrl: "https://cdn-ticket.xchievers.com/avatars/nzXfflgZi04p3zxdXGP2ZKLMo7Qx60sV/2ad3de3f-1a6e-46c7-82ec-42a3d62bd60c.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/naichen", imageUrl: "https://cdn-ticket.xchievers.com/avatars/2u3A3Q25laL4dK0D5Oyttuy2Ojh1ofe1/d8db181e-a923-4117-8996-6f11a7b135f4.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/dannyhu", imageUrl: "https://cdn-ticket.xchievers.com/avatars/nU1ZF9EOCEcT21orxZbStWSBbrqattp4/dbf2fa73-583f-44b3-9d85-41fb42077f1b.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/yyng", imageUrl: "https://cdn-ticket.xchievers.com/avatars/NPE5u4Zp3lRul6bmhxho5dKYKgQaxD5H/0fcfc338-170f-4c69-9c43-dc9193114c86.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/jingwenkate", imageUrl: "https://cdn-ticket.xchievers.com/avatars/Z55JVBUmIe2eXDIAAphmY6wbPXvKlpax/045b9d45-cfcd-4fa0-80c7-b35c64dcfee7.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/grantboo", imageUrl: "https://cdn-ticket.xchievers.com/avatars/WDDx63WxF8o3RZ6GGGrhfMEC61o3Wq0M/24b2b3a9-d1f2-4669-9480-64e1b2649052.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/josephlimzx", imageUrl: "https://cdn-ticket.xchievers.com/avatars/rA8M6YHI2uU7jxKUU61poXFJtp90GQfM/bd599ce0-08e1-4a81-a4c5-c9b4958c224c.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/IzkjJhBwjEX3kYA9rjgGaTPBI89kc7vM", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/IzkjJhBwjEX3kYA9rjgGaTPBI89kc7vM/2fff7b30-e746-48c2-b78c-b3836636f633.webp" },
  { profileUrl: "https://xchievers.com/815/participants/alissandre", imageUrl: "https://cdn-ticket.xchievers.com/avatars/mAe5AUsMvAOCFgijFfXK93zOWQUcSxIY/a025907d-eb77-4689-97aa-ea730651396b.webp" },
  { profileUrl: "https://xchievers.com/815/participants/vinjoacademy", imageUrl: "https://cdn-ticket.xchievers.com/avatars/27iTvADjwaCVPoBDpmMXnJ9UDNP9TmOV/737f038a-2efa-40cd-a828-01084792000c.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/4L1lzZjvftPTMYy8xCr9lz6fumBQehQM", imageUrl: "https://cdn-ticket.xchievers.com/avatars/4L1lzZjvftPTMYy8xCr9lz6fumBQehQM/62dc5c15-bb28-4d4c-8ccb-2f7bd7b22fa8.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/Gmczt3I2JUx7jNARN7YoFrXh9ocEsYzT", imageUrl: "https://cdn-ticket.xchievers.com/avatars/Gmczt3I2JUx7jNARN7YoFrXh9ocEsYzT/74ff4526-6010-4d66-947b-d8d0af12adb6.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/gracewx25", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/jjEMAHew8GAfte9tnNIvB3pgqTSPnXFG/8958dbaa-bf15-4439-8cd9-d505188b78ca.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/timi", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/hq6pg5wKyfRaKpozUy9M1HxHjmg1ykB6/870c93e0-2e68-4a7b-b770-b3662f77453f.webp" },
  { profileUrl: "https://xchievers.com/815/participants/ritchie", imageUrl: "https://cdn-ticket.xchievers.com/avatars/wJaZ2mOQifJWfY8iteJo8OicjDye65iT/617ee8bc-e45e-48a6-8652-a88d372fcfb0.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/SpvW8w68ISO0N576orJQsDODiLM8tTxW", imageUrl: "https://cdn-ticket.xchievers.com/avatars/SpvW8w68ISO0N576orJQsDODiLM8tTxW/c9437178-9618-4e45-b239-a694c61aab60.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/6KO3eGjStvmjUG8PEeHzD2C9TDLo9AwA", imageUrl: "https://cdn-ticket.xchievers.com/avatars/6KO3eGjStvmjUG8PEeHzD2C9TDLo9AwA/934ffbb5-d6e2-410e-adaf-870686ae9718.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/suan", imageUrl: "https://cdn-ticket.xchievers.com/avatars/vXdJX7RoiqMlo5o4l951xTHZWrE6czjy/55bac4cd-eb85-4a54-ad45-55499685cc3d.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/nHYFVLfYELIUOCQUwOnB6cv3YsoBFLGD", imageUrl: "https://cdn-ticket.xchievers.com/avatars/nHYFVLfYELIUOCQUwOnB6cv3YsoBFLGD/cb90177c-0db6-49d1-a109-c350dbb92473.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/Ym1zSZjOFk7irJr6rAvfxl4g5e5atVsM", imageUrl: "https://cdn-ticket.xchievers.com/avatars/Ym1zSZjOFk7irJr6rAvfxl4g5e5atVsM/73ef3125-bf17-4f89-9ac8-8d3d76b3394c.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/VWp9S9f7QteAggR8Ekbk6lbskMuP4AeU", imageUrl: "https://cdn-ticket.xchievers.com/avatars/VWp9S9f7QteAggR8Ekbk6lbskMuP4AeU/21e3571b-4d26-43d5-b865-4b352f2b310f.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/roeykerk", imageUrl: "https://cdn-ticket.xchievers.com/avatars/fdIHTC7E9CJpO8mWWNalBxaiZ9HlkK4w/d7678a43-22ad-47b9-b82f-3d228fa7489b.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/QScEAjuPb3phE0eGsQkvMyKBuPDRpsb2", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/QScEAjuPb3phE0eGsQkvMyKBuPDRpsb2/618e42ca-e0ab-4546-b121-2c887c99860e.png" },
  { profileUrl: "https://xchievers.com/815/participants/5GUxh5GtBgbVcsrO1kHUYfCNGeSWZBHj", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/5GUxh5GtBgbVcsrO1kHUYfCNGeSWZBHj/ef59aac4-0744-4ea6-b82e-102a76fdf2fc.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/bHQtlckBHBpauF3HoditvTuAlYpDGpoD", imageUrl: "https://cdn-ticket.xchievers.com/avatars/bHQtlckBHBpauF3HoditvTuAlYpDGpoD/09d4e55e-d772-4616-9951-1c98098762be.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/brianteh", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/t91PaLux3pofls9QhVWtW0LNoINj5HnH/e7295a24-646d-45cd-8582-cefa3068e6aa.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/p6UNGZo4mp4gWHDXFlq4bR1SMTKuanwS", imageUrl: "https://cdn-ticket.xchievers.com/avatars/p6UNGZo4mp4gWHDXFlq4bR1SMTKuanwS/7e36f182-dde7-40ee-82b7-a63698abd94f.png" },
  { profileUrl: "https://xchievers.com/815/participants/wpOQJRfPkTn5iPxtf2Sg285all6Qq2Mm", imageUrl: "https://cdn-ticket.xchievers.com/avatars/wpOQJRfPkTn5iPxtf2Sg285all6Qq2Mm/6d3f2d4d-f2aa-479c-b217-23e315aea0e0.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/dc1JGtJzprMTTlHxT3OHN6o4OzkbYjqX", imageUrl: "https://cdn-ticket.xchievers.com/avatars/dc1JGtJzprMTTlHxT3OHN6o4OzkbYjqX/e7658f9c-7f75-4bb8-adac-cc659bba8303.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/mileylim", imageUrl: "https://cdn-ticket.xchievers.com/avatars/zxUMO61Hvg3sxNDAmE6NZ9SC7UmTnJpM/4b0d42bd-f9ba-42b0-9b1c-fc138d963600.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/kexin", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/gWylsO5RwcvUteayp1J29UkSiqfcwPbo/c3d67d41-f64d-4bd5-a040-927abc5d9394.png" },
  { profileUrl: "https://xchievers.com/815/participants/39esCyfzqMpV2A3GCOMZGZLNt7gBFXZ5", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/39esCyfzqMpV2A3GCOMZGZLNt7gBFXZ5/f15f6400-1e1e-47af-bc5d-aed9c2c818d7.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/RL6MjjQt9gyjTgtleVLJvRWqAYCKytzD", imageUrl: "https://cdn-ticket.xchievers.com/avatars/RL6MjjQt9gyjTgtleVLJvRWqAYCKytzD/0b8ed923-4dd7-4450-9103-1c1a991d28af.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/khorcheeyen", imageUrl: "https://cdn-ticket.xchievers.com/avatars/agwE935dL4LYj2n42CHo1JcUW63abIa5/f5700ed9-0d87-4176-b4dd-ced590d4a3fb.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/vincent", imageUrl: "https://cdn-ticket.xchievers.com/avatars/H4xTDb4cGYeyyGrl6Lv4WWkCfrkfGA52/4006b1cd-0b5b-449d-a866-aa784c070454.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/yylim", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/LBcUzc3bOtfG4AT5WfATtVTOY7GyAS12/729c6f4f-014f-42d5-ad5a-d173d099768f.webp" },
  { profileUrl: "https://xchievers.com/815/participants/mwQI0mxuwK7YrcdkAq2yk4YgH6BSor3o", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/mwQI0mxuwK7YrcdkAq2yk4YgH6BSor3o/e40c9110-8e52-4bf5-bfd8-10144265117d.webp" },
  { profileUrl: "https://xchievers.com/815/participants/jennkher", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/uuyCbPMUG6sSmmakAr0PGddtOPMGKzRs/25316831-198d-4f7c-afb2-5d82fedb2e8d.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/winsonoo3943", imageUrl: "https://cdn-ticket.xchievers.com/avatars/mixIqDH447Az5GGPlkklWXDva3qmxZik/7a2e5045-852e-4d2a-bdac-93a961dda851.webp" },
  { profileUrl: "https://xchievers.com/815/participants/jermietan", imageUrl: "https://cdn-ticket.xchievers.com/avatars/Cox8t9kYQsCTVUUOMwNcg6sBcTgQxEJp/dcc6c2bf-1854-4b61-9d82-072b847884b4.png" },
  { profileUrl: "https://xchievers.com/815/participants/f2ikv9L75OKTvOdJZ7DHm1SXJQ2anUbq", imageUrl: "https://cdn-ticket.xchievers.com/avatars/f2ikv9L75OKTvOdJZ7DHm1SXJQ2anUbq/c4ed3ac3-9596-40de-ae5b-d35580914106.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/dqrd2Hv0QfPIquIpZWmcCfGDN1bb5uH1", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/dqrd2Hv0QfPIquIpZWmcCfGDN1bb5uH1/dd1be811-4711-422b-9c27-c0c5ee7f91cd.png" },
  { profileUrl: "https://xchievers.com/815/participants/PcaaaGl0v1qBu4mFviExuU0DmxxZXYTw", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/PcaaaGl0v1qBu4mFviExuU0DmxxZXYTw/dd9bd9eb-72e1-4a60-a631-f5e17c1636ef.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/q0WN372RUnGDS4y4uqpYnUI4Kc96C95M", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/q0WN372RUnGDS4y4uqpYnUI4Kc96C95M/203ee786-ad0d-4ffb-a053-870dc667455f.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/2wZHPGZj2KB42bz5bWSrRC8YfQjCqsS1", imageUrl: "https://cdn-ticket.xchievers.com/avatars/2wZHPGZj2KB42bz5bWSrRC8YfQjCqsS1/1a182952-11af-4f9a-b2ea-0c4c6e43b9a6.png" },
  { profileUrl: "https://xchievers.com/815/participants/oqQQuyPI0WCNxTBg4vWiiamEqC5kGadF", imageUrl: "https://cdn-ticket.xchievers.com/avatars/oqQQuyPI0WCNxTBg4vWiiamEqC5kGadF/c363b01d-0a75-4e2a-a55d-47ea3cf20e5b.webp" },
  { profileUrl: "https://xchievers.com/815/participants/Ub6yiBy1NwDNLrAS6GCLOePjFBukCcY0", imageUrl: "https://cdn-ticket.xchievers.com/avatars/Ub6yiBy1NwDNLrAS6GCLOePjFBukCcY0/6b7063c9-1102-4b52-845c-258df9443966.png" },
  { profileUrl: "https://xchievers.com/815/participants/YR2jiSbKfU1jKlviesGuaydQPa6qwRG0", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/YR2jiSbKfU1jKlviesGuaydQPa6qwRG0/3fe67113-2fde-4491-be04-874ecbf70576.webp" },
  { profileUrl: "https://xchievers.com/815/participants/VmtbdTXcKkfFy0pxMCCzlCdymXYjt0uD", imageUrl: "https://cdn-ticket.xchievers.com/avatars/VmtbdTXcKkfFy0pxMCCzlCdymXYjt0uD/a3acea7f-0785-4f60-a03f-f9baa4c96230.png" },
  { profileUrl: "https://xchievers.com/815/participants/ken-liftsoon-cncmachining", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/QgfN7DkrwuWr7buK5LwUH9WcU6pofNr9/615a0416-5da9-4c69-903f-a4bf206e2e16.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/pinkywong", imageUrl: "https://cdn-ticket.xchievers.com/avatars/ZDNPbxTW8WlVoHeE507oKDyWYyQBrDSC/c6725b4f-839c-4cb7-8563-e34803575da7.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/vk4v2e6V3vMSYtfrp243L59zlVmSKfJr", imageUrl: "https://cdn-ticket.xchievers.com/avatars/vk4v2e6V3vMSYtfrp243L59zlVmSKfJr/ed94f0ef-4715-424a-b169-4e8f59113124.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/KFdscNrsrUMdvQpU4x3qZU9SHhK7vmjk", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/KFdscNrsrUMdvQpU4x3qZU9SHhK7vmjk/cde6ad2c-dfe1-4b6f-9e21-9abf10663041.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/incom", imageUrl: "https://cdn-ticket.xchievers.com/avatars/dJufqVMTymoEhk2SRbrztIadidfdZCjF/90ea30bd-ea83-41f1-93de-23f25d6cc2fa.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/rzVqNIDzLRoA4gmnjvx7CSzx50YEXwr8", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/rzVqNIDzLRoA4gmnjvx7CSzx50YEXwr8/3b2a569a-efb7-4ce3-8a69-724e70f0ef18.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/boonee_vinjo", imageUrl: "https://cdn-ticket.xchievers.com/avatars/OrLRWws6OFiTawmKEbruGUyiVths7cCx/acb3b6de-d7ff-4514-bc55-b67823f936b9.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/lyeqsXcoyzybCyVpgXkrKruTROM503qo", imageUrl: "https://cdn-ticket.xchievers.com/avatars/lyeqsXcoyzybCyVpgXkrKruTROM503qo/1ae13f84-13db-45a5-b25c-6f1d1033c5ab.webp" },
  { profileUrl: "https://xchievers.com/815/participants/3HHZz1uDEa9X3FV5HhC4NdghM3FXYdok", imageUrl: "https://cdn-ticket.xchievers.com/avatars/3HHZz1uDEa9X3FV5HhC4NdghM3FXYdok/247fd4a8-e902-4767-b9ff-3a6d90d4a9ed.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/calAKLiiaSCa3GlCPyAmmf3BejeCFN2x", imageUrl: "https://cdn-ticket.xchievers.com/avatars/calAKLiiaSCa3GlCPyAmmf3BejeCFN2x/b48756ac-5ab3-44da-9267-07abe73fba12.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/UGdxJ6vbFZqqSmNeMrqvoHM0erDMx9bW", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/UGdxJ6vbFZqqSmNeMrqvoHM0erDMx9bW/663ac6a3-8718-4e7b-b6e2-deb211edc6c7.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/AiEKfCGbAMBdcw5Qr32hPxVMlaRd4m5L", imageUrl: "https://cdn-ticket.xchievers.com/avatars/AiEKfCGbAMBdcw5Qr32hPxVMlaRd4m5L/1b7a4ca4-46d3-4c96-9cbb-8e309cc4c198.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/kelly", imageUrl: "https://cdn-ticket.xchievers.com/avatars/3WVCIwltvmpkOVpOFZh2ND4BDSQo66AE/367ca92f-4815-41d7-a138-9b36136dae65.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/8GqyAPLccw9nXEfIBIF7giN4RLPoeFPB", imageUrl: "https://cdn-ticket.xchievers.com/company-logos/8GqyAPLccw9nXEfIBIF7giN4RLPoeFPB/6ffdd7b1-3dad-4f31-a7ef-82eba6e8e61b.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/1234", imageUrl: "https://cdn-ticket.xchievers.com/avatars/jhSOLSjuHEtzfwCDqkZ3etimOsIMfFvJ/080dbdb2-3117-49a0-8ebe-922c441fd0e8.webp" },
  { profileUrl: "https://xchievers.com/815/participants/EN5GPlKdVTX4rUAWf50nFTt9BhSFyh0P", imageUrl: "https://cdn-ticket.xchievers.com/avatars/EN5GPlKdVTX4rUAWf50nFTt9BhSFyh0P/00e6f974-c631-4026-bd9d-7e3b44968242.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/JHKHWGzsuPR9KjVppyaYmZpYqu9ElBv2", imageUrl: "https://cdn-ticket.xchievers.com/avatars/JHKHWGzsuPR9KjVppyaYmZpYqu9ElBv2/ddbea74c-041c-4eff-8330-27285a928aa9.webp" },
  { profileUrl: "https://xchievers.com/815/participants/dE0kVl1zlOKMsImlnvB4s1oIKtuEzu72", imageUrl: "https://cdn-ticket.xchievers.com/avatars/dE0kVl1zlOKMsImlnvB4s1oIKtuEzu72/591643bc-1f3c-491f-a9bd-e116fdb46b43.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/MtzrMnOgLmhhf0B7NNKDGDoSbIa1mxh6", imageUrl: "https://cdn-ticket.xchievers.com/avatars/MtzrMnOgLmhhf0B7NNKDGDoSbIa1mxh6/91f99675-1e47-4cab-b2fd-d2bfb116cb07.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/jianing", imageUrl: "https://cdn-ticket.xchievers.com/avatars/sZCnyFV00RIR8211GRLqZlhZ99CQOl4v/f8f248be-0463-4a8a-8092-73a958148ac7.jpg" },
  { profileUrl: "https://xchievers.com/815/participants/khoo", imageUrl: "https://cdn-ticket.xchievers.com/avatars/F79ge4PvpHtMEUoJ8MebIYNKVNrJ5G2E/2cf41cbb-fcb3-4267-8150-a42cdfb04de4.jpg" },];

function slugFromProfileUrl(url: string) {
  const raw = url.split("/").filter(Boolean).pop() ?? "photo";
  return raw.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extFromUrl(url: string) {
  const match = /\.(jpe?g|png|webp|gif)(?:\?|#|$)/i.exec(url);
  return match ? match[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  let downloaded = 0;
  let alreadyOnDisk = 0;
  let downloadFailed = 0;
  let updated = 0;
  let noMatchingContact = 0;
  let skippedHasOwnPhoto = 0;

  for (const { profileUrl, imageUrl } of PHOTOS) {
    const filename = `${slugFromProfileUrl(profileUrl)}.${extFromUrl(imageUrl)}`;
    const filePath = path.join(OUTPUT_DIR, filename);
    const publicPath = `/uploads/contacts/${filename}`;

    if (existsSync(filePath)) {
      alreadyOnDisk += 1;
    } else {
      try {
        const res = await fetch(imageUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await writeFile(filePath, Buffer.from(await res.arrayBuffer()));
        downloaded += 1;
        console.log(`downloaded   ${filename}`);
        await sleep(REQUEST_DELAY_MS);
      } catch (error) {
        downloadFailed += 1;
        console.error(`FAILED       ${filename}: ${error instanceof Error ? error.message : error}`);
        continue;
      }
    }

    const contact = await db.contact.findFirst({
      where: { notes: { contains: `Profile: ${profileUrl}` } },
      select: { id: true, photoUrl: true },
    });
    if (!contact) {
      noMatchingContact += 1;
      console.error(`no contact   ${filename} (profile: ${profileUrl})`);
      continue;
    }
    if (contact.photoUrl && contact.photoUrl !== imageUrl && contact.photoUrl !== publicPath) {
      skippedHasOwnPhoto += 1;
      continue;
    }

    await db.contact.update({ where: { id: contact.id }, data: { photoUrl: publicPath } });
    updated += 1;
  }

  console.log(
    [
      "",
      `${downloaded} downloaded, ${alreadyOnDisk} already on disk, ${downloadFailed} failed to download.`,
      `${updated} contacts updated, ${noMatchingContact} had no matching contact, ${skippedHasOwnPhoto} already had a different photo set (left alone).`,
    ].join("\n"),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
