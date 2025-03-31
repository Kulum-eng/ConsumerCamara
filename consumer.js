const amqp = require('amqplib');

const RABBITMQ_URL = 'amqp://ale:ale123@ec2-54-167-194-141.compute-1.amazonaws.com:5672';
const QUEUE_NAME = 'imagenes';
const API_IA_URL = 'http://localhost:3000/compare'; 

async function sendToIA(base64Data) {
  try {
    const response = await fetch(API_IA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ base64: base64Data })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error al enviar a IA:', error.message);
    return null;
  }
}

async function startConsumer() {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();
    
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`🔍 Escuchando cola "${QUEUE_NAME}"...`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg) {
        const imageBase64 = msg.content.toString();
        console.log('📥 Mensaje recibido (', msg.content.length, 'bytes)');

        const iaResponse = await sendToIA(imageBase64);
        
        if (iaResponse) {
          console.log('🤖 Respuesta IA:', {
            match: iaResponse.match ? '✅ COINCIDENCIA' : '❌ NO COINCIDE',
            similarity: `${iaResponse.similarity?.toFixed(2) || 0}%`
          });
        } else {
          console.log('🤖 IA no respondió correctamente');
        }

        channel.ack(msg);
      }
    });

  } catch (error) {
    console.error('❌ Error RabbitMQ:', error.message);
    setTimeout(startConsumer, 5000);
  }
}

process.on('SIGINT', async () => {
  console.log('\n🔴 Deteniendo consumer...');
  process.exit(0);
});

startConsumer();