// utils/googleCalendar.js
import { google } from 'googleapis';

let calendarInstance = null;

export async function getAuthenticatedGoogleCalendar() {
  if (calendarInstance) return calendarInstance;

  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/calendar']
  );

  calendarInstance = google.calendar({ version: 'v3', auth });
  return calendarInstance;
}

export async function createCalendarEvent(calendarId, eventResource) {
  const calendar = await getAuthenticatedGoogleCalendar();
  const response = await calendar.events.insert({
    calendarId,
    requestBody: eventResource,
  });
  return response.data;
}

export async function createExcecaoDadosEvent({
  summary,
  description,
  date, // 'YYYY-MM-DD'
  timeZone = 'America/Sao_Paulo',
}) {
  const calendarId = process.env.EXCECAO_DADOS_CALENDAR_ID;
  if (!calendarId) return null; // opcional: não bloquear se agenda não estiver configurada

  // Evento de dia inteiro: end.date deve ser o dia seguinte
  const nextDay = (() => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const iso = d.toISOString().slice(0, 10);
    return iso;
  })();

  const event = {
    summary,
    description,
    start: { date, timeZone },
    end: { date: nextDay, timeZone },
  };

  return await createCalendarEvent(calendarId, event);
}


