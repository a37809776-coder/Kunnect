// 개발용 측정값 주입: 실제 디바이스처럼 /api/device/readings 를 호출한다.
// 예) npm run inject -- --serial PC-0001 --moisture 20
//     DEVICE_TOKEN 환경변수가 없으면 데모 토큰을 쓴다.
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    serial: { type: "string", default: "PC-0001" },
    moisture: { type: "string", default: "50" },
    temp: { type: "string", default: "22" },
    light: { type: "string", default: "3000" },
    battery: { type: "string", default: "80" },
    url: { type: "string", default: "http://localhost:3000" },
  },
});

const res = await fetch(`${values.url}/api/device/readings`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${process.env.DEVICE_TOKEN ?? "demo-device-token"}`,
  },
  body: JSON.stringify({
    serial: values.serial,
    soil_moisture: Number(values.moisture),
    temperature: Number(values.temp),
    light: Number(values.light),
    battery: Number(values.battery),
  }),
});
console.log(res.status, await res.json());
