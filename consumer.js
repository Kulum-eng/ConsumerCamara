const amqp = require('amqplib');

const RABBITMQ_URL = 'amqp://ale:ale123@ec2-54-167-194-141.compute-1.amazonaws.com:5672';
const QUEUE_NAME = 'imagenes';

async function startConsumer() {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();
    
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    
    console.log(` Escuchando cola "${QUEUE_NAME}"...`);

    channel.consume(QUEUE_NAME, (msg) => {
      if (msg) {
        console.log('✅ ¡Mensaje recibido! (Longitud:', msg.content.length, 'bytes)');
        channel.ack(msg);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    setTimeout(startConsumer, 5000);
  }
}

startConsumer();