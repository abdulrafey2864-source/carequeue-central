# Queue Harmony

Build the Hospital Queue & Appointment Management System based on the attached documentation and specifications using Supabase as the database.

Key requirements and roles:
1. Bilingual Support: Full English and Urdu support with correct RTL (right-to-left) rendering and persistent language preference.
2. Patient Role:
   - Registration, login, and profile setup.
   - Bilingual consent notice for photo identity verification.
   - Camera capture with live preview and unlimited retake option until tapping "Confirm & Lock Photo". Once locked, the patient cannot change the photo.
   - Browse departments and doctors, book appointments, and receive a digital queue token.
   - Live visual queue tracker (current token, own token, progress bar, estimated wait time).
   - Turn notification and appointment history.
3. Staff (Receptionist / Triage) Role:
   - Check-in arriving patients to activate them in the live queue.
   - Register walk-in patients and generate queue tokens.
   - Record preliminary triage vitals (blood pressure, temperature, pulse, weight, chief complaint).
   - Queue overview and monitoring.
   - Staff photo management: ability to soft-reset or remove invalid/blurred patient photos with recorded justification. Staff cannot access doctor clinical notes, diagnoses, or prescriptions.
4. Doctor Role:
   - Daily queue dashboard showing checked-in patients.
   - "Call Next Patient" action that advances the queue, sends alerts, and automatically opens the called patient's profile, photo, triage vitals, and previous visit transcripts.
   - Record clinical consultation notes, diagnosis, and prescriptions. Marking the visit completed finalizes and locks the transcript.
   - Emergency "Break-Glass" access: allows a doctor to view an unassigned patient's records during emergencies with mandatory clinical justification, creating a high-priority audit log entry.
5. Admin Role:
   - Manage doctor accounts, staff accounts, and hospital departments.
   - Configure queue rules (slot duration, max daily patients, walk-in rules).
   - System-wide live queue monitoring and operational analytics (wait times, peak hours, no-show rates).
   - View immutable system audit logs tracking all actions (photo locks, staff resets, triage entries, queue advancements, break-glass access, and transcript finalizations).
6. Data Architecture:
   - Supabase schema separating operational visits/triage from confidential clinical transcripts to enforce strict need-to-know access boundaries.
   - Private bucket storage for patient photos with role-gated access.
   - Immutable audit logging ensuring no records can be deleted or altered.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/89621754-f6be-4d1d-8fe6-88dbb9e859f3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
