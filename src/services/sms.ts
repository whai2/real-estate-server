// eslint-disable-next-line @typescript-eslint/no-var-requires
const coolsms = require('coolsms-node-sdk').default;

let messageService: any = null;

function getMessageService() {
  if (!messageService) {
    messageService = new coolsms(
      process.env.COOLSMS_API_KEY!,
      process.env.COOLSMS_API_SECRET!
    );
  }
  return messageService;
}

export async function sendSMS(to: string, text: string): Promise<void> {
  await getMessageService().sendOne({
    to,
    from: process.env.COOLSMS_FROM_PHONE!,
    text,
    autoTypeDetect: true,
  });
}
