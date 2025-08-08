// utils/googleCalendar.js
import { google } from 'googleapis';

let calendarInstance = null;

export async function getAuthenticatedGoogleCalendar() {
  if (calendarInstance) return calendarInstance;

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const scopes = ['https://www.googleapis.com/auth/calendar'];
  const subject = process.env.EXCECAO_DADOS_CALENDAR_IMPERSONATE || undefined;

  const auth = new google.auth.JWT(clientEmail, null, privateKey, scopes, subject);

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

export async function listEventsOnDate(calendarId, date) {
  const calendar = await getAuthenticatedGoogleCalendar();
  // timeMin inclusive at 00:00, timeMax exclusive next-day 00:00
  const start = new Date(date + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const res = await calendar.events.list({
    calendarId,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    maxResults: 50,
    orderBy: 'startTime',
  });
  return res.data.items || [];
}

export async function deleteCalendarEvent(calendarId, eventId) {
  const calendar = await getAuthenticatedGoogleCalendar();
  await calendar.events.delete({ calendarId, eventId });
}

export async function removeExcecaoDadosEventByMatch({ date, summary, description }) {
  const calendarId = process.env.EXCECAO_DADOS_CALENDAR_ID;
  if (!calendarId) return false;
  const items = await listEventsOnDate(calendarId, date);
  const match = items.find(ev => (ev.summary || '') === summary && (ev.description || '') === description);
  if (match?.id) {
    await deleteCalendarEvent(calendarId, match.id);
    return true;
  }
  return false;
}


