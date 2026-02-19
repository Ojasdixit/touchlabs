import Groq from 'groq-sdk';
import { getServices, getStaff, getAppointments, createAppointment } from '@/lib/actions';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Tools Definition ─────────────────────────────────────
const tools = [
    {
        type: 'function',
        function: {
            name: 'get_services',
            description: 'Get list of services offered by the business with prices and durations',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'check_availability',
            description: 'Check available slots for a given service and date',
            parameters: {
                type: 'object',
                properties: {
                    service_name: { type: 'string', description: 'Name of the service user wants' },
                    date: { type: 'string', description: 'YYYY-MM-DD format (default to today if not specified)' },
                },
                required: ['service_name'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'book_appointment',
            description: 'Book an appointment for the user',
            parameters: {
                type: 'object',
                properties: {
                    client_name: { type: 'string' },
                    client_phone: { type: 'string' },
                    service_name: { type: 'string' },
                    staff_name: { type: 'string', description: 'Optional preferrred staff' },
                    start_time: { type: 'string', description: 'ISO 8601 datetime string' },
                },
                required: ['client_name', 'client_phone', 'service_name', 'start_time'],
            },
        },
    },
];

// ─── Tool Handlers ────────────────────────────────────────
async function handleToolCall(toolCall: any) {
    const { name, arguments: argsJson } = toolCall.function;
    const args = JSON.parse(argsJson);

    if (name === 'get_services') {
        const services = await getServices();
        return JSON.stringify(services.map((s: any) => ({ name: s.name, price: s.price, duration: s.duration_minutes })));
    }

    if (name === 'check_availability') {
        // Basic mock logic using real services
        const services = await getServices();
        const service = services.find((s: any) => s.name.toLowerCase().includes(args.service_name.toLowerCase()));

        if (!service) return JSON.stringify({ error: 'Service not found' });

        // In a real app, check staff schedules and existing appointments.
        // For now, return mock slots for today/tomorrow
        return JSON.stringify({
            available_slots: ['10:00 AM', '11:30 AM', '2:00 PM', '4:30 PM'],
            date: args.date || new Date().toISOString().split('T')[0],
            service: service.name,
        });
    }

    if (name === 'book_appointment') {
        // 1. Find service ID
        const services = await getServices();
        const service = services.find((s: any) => s.name.toLowerCase().includes(args.service_name.toLowerCase()));
        if (!service) return JSON.stringify({ error: 'Service not found. Please pick from list.' });

        // 2. Find ANY staff ID (for now, pick first one)
        const staffList = await getStaff();
        const staff = staffList[0]; // Simplification for chat demo
        if (!staff) return JSON.stringify({ error: 'No staff available' });

        // 3. Create Appointment
        const endTime = new Date(new Date(args.start_time).getTime() + service.duration_minutes * 60000).toISOString();

        const result = await createAppointment({
            staff_id: staff.id,
            service_id: service.id,
            client_name: args.client_name,
            client_phone: args.client_phone,
            booked_via: 'chat', // Mark as chat booking
            start_time: args.start_time,
            end_time: endTime,
            notes: 'Booked via AI Chat',
        });

        if (result.error) return JSON.stringify({ error: result.error });
        return JSON.stringify({ success: true, booking_id: result.data.id, message: 'Booking confirmed!' });
    }

    return JSON.stringify({ error: 'Unknown tool' });
}

// ─── Main Chat Function ───────────────────────────────────
export async function chatWithAI(messages: any[], tenantConfig: any) {
    const systemPrompt = `
    You are ${tenantConfig.persona_name || 'an AI assistant'}, working for "${tenantConfig.business_name || 'Touch Labs'}".
    Your goal is to help users book appointments.
    
    Config:
    - Greeting: "${tenantConfig.greeting}"
    - Tone: ${tenantConfig.voice_style}

    Instructions:
    - If user asks for services, call 'get_services'.
    - If user asks availability, call 'check_availability'.
    - If user wants to book, ask for Name and Phone if not provided, then call 'book_appointment'.
    - Be concise and friendly.
    - Today is ${new Date().toLocaleString()}.
  `;

    const conversation = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];

    try {
        const completion = await groq.chat.completions.create({
            messages: conversation as any,
            model: 'llama-3.3-70b-versatile',
            tools: tools as any,
            tool_choice: 'auto',
            max_tokens: 1024,
        });

        const responseMessage = completion.choices[0].message;

        // Handle Function Calls
        if (responseMessage.tool_calls) {
            conversation.push(responseMessage); // Add assistant's call to history

            for (const toolCall of responseMessage.tool_calls) {
                const toolResult = await handleToolCall(toolCall);
                conversation.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: toolResult,
                });
            }

            // Second call to get final answer
            const finalCompletion = await groq.chat.completions.create({
                messages: conversation as any,
                model: 'llama-3.3-70b-versatile',
            });

            return finalCompletion.choices[0].message.content;
        }

        return responseMessage.content;
    } catch (error: any) {
        console.error('Groq Error:', error);
        return `Error: ${error.message}`;
    }
}
