// eslint-disable-next-line @typescript-eslint/no-var-requires
const coolsms = require('coolsms-node-sdk').default;

const messageService = new coolsms(
  process.env.COOLSMS_API_KEY!,
  process.env.COOLSMS_API_SECRET!
);

export async function sendSMS(to: string, text: string): Promise<void> {
  await messageService.sendOne({
    to,
    from: process.env.COOLSMS_FROM_PHONE!,
    text,
    autoTypeDetect: true,
  });
}
