--
-- PostgreSQL database dump
--

\restrict NiNJ7G0MSmTXlPfkNma3l2b1oZRVl0JfGarOWdIx25yhEQzGtGFQtwC2ZW3Z0Cf

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ApplicationStatus; Type: TYPE; Schema: public; Owner: bhu_user
--

CREATE TYPE public."ApplicationStatus" AS ENUM (
    'DRAFT',
    'PENDING_HOD',
    'APPROVED_HOD',
    'REJECTED_HOD',
    'PENDING_DEAN',
    'APPROVED_DEAN',
    'REJECTED_DEAN',
    'PENDING_CC',
    'PROVISIONED',
    'FAILED_PROVISIONING',
    'REJECTED_CC',
    'SUSPENDED',
    'ARCHIVED'
);


ALTER TYPE public."ApplicationStatus" OWNER TO bhu_user;

--
-- Name: RequestStatus; Type: TYPE; Schema: public; Owner: bhu_user
--

CREATE TYPE public."RequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."RequestStatus" OWNER TO bhu_user;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: bhu_user
--

CREATE TYPE public."Role" AS ENUM (
    'APPLICANT',
    'HOD',
    'DEAN',
    'CC_ADMIN'
);


ALTER TYPE public."Role" OWNER TO bhu_user;

--
-- Name: prevent_audit_modifications(); Type: FUNCTION; Schema: public; Owner: bhu_user
--

CREATE FUNCTION public.prevent_audit_modifications() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted.';
END;
$$;


ALTER FUNCTION public.prevent_audit_modifications() OWNER TO bhu_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Application; Type: TABLE; Schema: public; Owner: bhu_user
--

CREATE TABLE public."Application" (
    id text NOT NULL,
    "trackingId" text DEFAULT concat('BHU-', to_char(now(), 'YYYYMMDD'::text), '-', (floor(((random() * (9000)::double precision) + (1000)::double precision)))::text) NOT NULL,
    "applicantId" text NOT NULL,
    "departmentId" text NOT NULL,
    status public."ApplicationStatus" DEFAULT 'PENDING_HOD'::public."ApplicationStatus" NOT NULL,
    "applicantDetails" jsonb NOT NULL,
    "photoStoragePath" text NOT NULL,
    "signatureStoragePath" text,
    "hodId" text,
    "hodRemarks" text,
    "hodApprovedAt" timestamp(3) without time zone,
    "deanId" text,
    "deanRemarks" text,
    "deanApprovedAt" timestamp(3) without time zone,
    "digitalSignatureHash" text,
    "approvedPdfPath" text,
    "ccAdminRemarks" text,
    "provisionedAt" timestamp(3) without time zone,
    "quotaAssignedGB" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "expectedExpiryDate" timestamp(3) without time zone
);


ALTER TABLE public."Application" OWNER TO bhu_user;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: bhu_user
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    action text NOT NULL,
    "performedBy" text NOT NULL,
    "ipAddress" text NOT NULL,
    payload jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO bhu_user;

--
-- Name: Department; Type: TABLE; Schema: public; Owner: bhu_user
--

CREATE TABLE public."Department" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "hodId" text,
    "deanId" text
);


ALTER TABLE public."Department" OWNER TO bhu_user;

--
-- Name: DepartmentRequest; Type: TABLE; Schema: public; Owner: bhu_user
--

CREATE TABLE public."DepartmentRequest" (
    id text NOT NULL,
    "requestedName" text NOT NULL,
    "applicantId" text NOT NULL,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    "adminRemarks" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DepartmentRequest" OWNER TO bhu_user;

--
-- Name: OtpVerification; Type: TABLE; Schema: public; Owner: bhu_user
--

CREATE TABLE public."OtpVerification" (
    id text NOT NULL,
    email text NOT NULL,
    "otpHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."OtpVerification" OWNER TO bhu_user;

--
-- Name: ReapplyRequest; Type: TABLE; Schema: public; Owner: bhu_user
--

CREATE TABLE public."ReapplyRequest" (
    id text NOT NULL,
    "applicationId" text NOT NULL,
    "applicantId" text NOT NULL,
    reason text NOT NULL,
    "rollEmployeeId" text NOT NULL,
    "applicantName" text NOT NULL,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    "hodRemarks" text,
    "deanRemarks" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ReapplyRequest" OWNER TO bhu_user;

--
-- Name: User; Type: TABLE; Schema: public; Owner: bhu_user
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "alternateEmail" text NOT NULL,
    "bhuEmail" text,
    "passwordHash" text NOT NULL,
    "refreshToken" text,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    role public."Role" DEFAULT 'APPLICANT'::public."Role" NOT NULL,
    "requiresPasswordChange" boolean DEFAULT false NOT NULL,
    "signatureStoragePath" text,
    "departmentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "roleExpiryDate" timestamp(3) without time zone,
    "retirementDate" timestamp(3) without time zone
);


ALTER TABLE public."User" OWNER TO bhu_user;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: bhu_user
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO bhu_user;

--
-- Data for Name: Application; Type: TABLE DATA; Schema: public; Owner: bhu_user
--

COPY public."Application" (id, "trackingId", "applicantId", "departmentId", status, "applicantDetails", "photoStoragePath", "signatureStoragePath", "hodId", "hodRemarks", "hodApprovedAt", "deanId", "deanRemarks", "deanApprovedAt", "digitalSignatureHash", "approvedPdfPath", "ccAdminRemarks", "provisionedAt", "quotaAssignedGB", "createdAt", "updatedAt", "expectedExpiryDate") FROM stdin;
e18ba085-dcb4-4935-bdc3-212e5c1541d9	DEAN-APP-0-49403	58a847cd-dc99-4c90-af24-c4f5b18c7894	dept-cs	PENDING_HOD	{"category": "GROUP_A_OFFICER", "mobileNo": "9876553556", "employeeId": "EMP1000", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_ga_0@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-13 03:02:09.286	2026-07-13 18:31:50.362	\N
57a2d8f9-c311-4d33-8b7b-88ef9f833f34	DEAN-APP-1-21644	f80dfde2-8101-4c8a-a98e-7d5f296065d2	dept-cs	PENDING_HOD	{"category": "GROUP_A_OFFICER", "mobileNo": "9876575262", "employeeId": "EMP1001", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_ga_1@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-27 19:29:17.845	2026-07-13 18:31:50.395	\N
f8ef369e-4c4e-4e9e-86c1-c7e44cbb3699	DEAN-APP-2-72871	c8ca780a-5d82-4146-9c01-d5fc89acd8b9	dept-cs	PENDING_HOD	{"category": "GROUP_A_OFFICER", "mobileNo": "9876514104", "employeeId": "EMP1002", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_ga_2@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-10 16:52:09.056	2026-07-13 18:31:50.415	\N
1d8041bb-f172-4537-9e6f-42215b5d6d29	DEAN-APP-3-48313	c477bcf4-15dd-40b6-98e9-9d39d043b579	dept-cs	APPROVED_HOD	{"category": "GROUP_A_OFFICER", "mobileNo": "9876572426", "employeeId": "EMP1003", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_ga_3@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.429	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-02 08:14:17.246	2026-07-13 18:31:50.43	\N
33a51c6b-eb16-42d4-8967-4d073ff1be09	DEAN-APP-4-19968	8a632ada-544c-4534-9a71-0aa146a52c66	dept-cs	APPROVED_HOD	{"category": "GROUP_A_OFFICER", "mobileNo": "9876589898", "employeeId": "EMP1004", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_ga_4@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.44	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-02 19:46:26.616	2026-07-13 18:31:50.441	\N
c7011417-3541-4e86-ad0c-eb5c7204b83f	DEAN-APP-5-51870	cb91ee77-6aec-45f7-93da-ec632dbfd813	dept-cs	APPROVED_HOD	{"category": "GROUP_A_OFFICER", "mobileNo": "9876515426", "employeeId": "EMP1005", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_ga_5@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.451	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-02 02:56:28.333	2026-07-13 18:31:50.452	\N
7062a9c8-8929-4007-94a3-91e224f51e1f	DEAN-APP-6-48120	d9d80baf-cf18-4c8b-b712-2268ea83e03a	dept-cs	REJECTED_HOD	{"category": "GROUP_A_OFFICER", "mobileNo": "9876540301", "employeeId": "EMP1006", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_ga_6@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.459	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-15 15:48:30.372	2026-07-13 18:31:50.46	\N
23811c42-15ef-469f-8ee3-6ade1acd761d	DEAN-APP-7-95804	af1cd2e4-323f-458b-acd8-f7903f344607	dept-cs	REJECTED_HOD	{"category": "GROUP_A_OFFICER", "mobileNo": "9876512971", "employeeId": "EMP1007", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_ga_7@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.475	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-09 15:19:31.414	2026-07-13 18:31:50.476	\N
73d85013-4835-4f6b-81d2-8861f5622726	DEAN-APP-8-29200	ba2aa021-9686-4f38-8e93-85735178cb36	dept-cs	PROVISIONED	{"category": "GROUP_A_OFFICER", "mobileNo": "9876560248", "employeeId": "EMP1008", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_ga_8@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.493	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-13 23:22:59.081	2026-07-13 18:31:50.495	\N
0c72f393-2649-41d3-92a2-9c9669cf7ab8	DEAN-APP-9-76901	15b1ea06-28d2-4980-91d9-057e38ee2f75	dept-cs	PROVISIONED	{"category": "GROUP_A_OFFICER", "mobileNo": "9876579761", "employeeId": "EMP1009", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_ga_9@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.509	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-25 05:45:38.636	2026-07-13 18:31:50.511	\N
f89c5d13-895b-4a88-a1ea-a9a5280abb9f	DEAN-APP-0-56204	abf9c259-a889-477e-a757-9547f13fadd2	dept-cs	PENDING_HOD	{"category": "TEACHING_STAFF", "mobileNo": "9876596338", "employeeId": "EMP1000", "dateOfBirth": "1990-01-01", "designation": "Assistant Professor", "emailChoice": "dummy_ts_0@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-05 06:50:39.261	2026-07-13 18:31:50.52	\N
c6b3bd29-e15a-425e-ac05-73c1a47c4084	DEAN-APP-1-64292	df13ab39-9381-44fc-98bc-2899b9561ddd	dept-cs	PENDING_HOD	{"category": "TEACHING_STAFF", "mobileNo": "9876581007", "employeeId": "EMP1001", "dateOfBirth": "1990-01-01", "designation": "Assistant Professor", "emailChoice": "dummy_ts_1@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-13 12:34:40.426	2026-07-13 18:31:50.528	\N
8fccb413-748c-49a6-9897-d8073fcaba46	DEAN-APP-2-39343	db3826fb-2a50-42c1-ba95-04a29796ada0	dept-cs	PENDING_HOD	{"category": "TEACHING_STAFF", "mobileNo": "9876590898", "employeeId": "EMP1002", "dateOfBirth": "1990-01-01", "designation": "Assistant Professor", "emailChoice": "dummy_ts_2@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-11 01:10:38.25	2026-07-13 18:31:50.541	\N
1d51f9dd-2fef-41ba-8c46-6790cbab3016	DEAN-APP-3-69079	43e619cd-7a1f-48f9-aad8-f35ee9618895	dept-cs	APPROVED_HOD	{"category": "TEACHING_STAFF", "mobileNo": "9876571155", "employeeId": "EMP1003", "dateOfBirth": "1990-01-01", "designation": "Assistant Professor", "emailChoice": "dummy_ts_3@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.549	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-09 21:15:17.441	2026-07-13 18:31:50.55	\N
d6b5bea4-5a1b-4ee5-9276-56852cb10760	DEAN-APP-4-91675	48fbf2c1-d85a-4226-8f48-3ee3b8db1985	dept-cs	APPROVED_HOD	{"category": "TEACHING_STAFF", "mobileNo": "9876577152", "employeeId": "EMP1004", "dateOfBirth": "1990-01-01", "designation": "Assistant Professor", "emailChoice": "dummy_ts_4@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.562	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-18 08:49:28.999	2026-07-13 18:31:50.563	\N
5157568b-03bf-47fc-bcd4-05a1a0eda8a8	DEAN-APP-5-33913	cfb7a700-d71c-4f22-99b5-a5c03591a343	dept-cs	APPROVED_HOD	{"category": "TEACHING_STAFF", "mobileNo": "9876524215", "employeeId": "EMP1005", "dateOfBirth": "1990-01-01", "designation": "Assistant Professor", "emailChoice": "dummy_ts_5@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.574	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-08 07:43:09.732	2026-07-13 18:31:50.576	\N
38714c1c-08ae-4f34-8e9b-2dff342a8e25	DEAN-APP-6-70783	a32fa40f-3002-49f7-8578-1ee7f8805ede	dept-cs	REJECTED_HOD	{"category": "TEACHING_STAFF", "mobileNo": "9876558050", "employeeId": "EMP1006", "dateOfBirth": "1990-01-01", "designation": "Assistant Professor", "emailChoice": "dummy_ts_6@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.587	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-28 01:15:05.99	2026-07-13 18:31:50.588	\N
686893bc-598c-4f21-954d-116caf6fe428	DEAN-APP-7-75194	32a78175-f10f-4bf2-9cd8-2b2e4ee85dcc	dept-cs	REJECTED_HOD	{"category": "TEACHING_STAFF", "mobileNo": "9876578269", "employeeId": "EMP1007", "dateOfBirth": "1990-01-01", "designation": "Assistant Professor", "emailChoice": "dummy_ts_7@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.605	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-05 14:47:27.314	2026-07-13 18:31:50.606	\N
641ab66a-59a9-4f10-9d75-819dc0d52834	DEAN-APP-8-31021	3de833fc-a1ab-43cd-be4c-a7786692f36a	dept-cs	PROVISIONED	{"category": "TEACHING_STAFF", "mobileNo": "9876560970", "employeeId": "EMP1008", "dateOfBirth": "1990-01-01", "designation": "Assistant Professor", "emailChoice": "dummy_ts_8@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.621	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-30 02:04:54.29	2026-07-13 18:31:50.622	\N
d74adc53-b351-4b24-90e8-10c148a18ed3	DEAN-APP-9-33229	463e9f41-ef68-4d2a-a731-fccbe436294c	dept-cs	PROVISIONED	{"category": "TEACHING_STAFF", "mobileNo": "9876568093", "employeeId": "EMP1009", "dateOfBirth": "1990-01-01", "designation": "Assistant Professor", "emailChoice": "dummy_ts_9@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.632	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-10 15:20:23.217	2026-07-13 18:31:50.633	\N
1cb66b25-3b1d-4b59-80d2-fb13f8be7213	DEAN-APP-0-47371	b0e90227-2492-4c8d-a630-859ef04f8404	dept-cs	PENDING_HOD	{"category": "NON_TEACHING_STAFF", "mobileNo": "9876529965", "employeeId": "EMP1000", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_nts_0@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-04 23:28:39.714	2026-07-13 18:31:50.643	\N
9d805630-a23e-4cde-90ed-55d1b10fce7d	DEAN-APP-1-95280	18512ab6-f1b0-4767-9a1a-3c4da1dbd8d7	dept-cs	PENDING_HOD	{"category": "NON_TEACHING_STAFF", "mobileNo": "9876591637", "employeeId": "EMP1001", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_nts_1@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-21 22:24:05.493	2026-07-13 18:31:50.652	\N
bfa2f5e0-c075-4d62-b890-6ac1d84bb9e3	DEAN-APP-2-91614	46647a17-d905-4f92-85c2-75342a404e97	dept-cs	PENDING_HOD	{"category": "NON_TEACHING_STAFF", "mobileNo": "9876541051", "employeeId": "EMP1002", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_nts_2@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-08 15:01:35.484	2026-07-13 18:31:50.659	\N
8b676235-7efa-496c-843d-90baa20ec0e3	DEAN-APP-3-26712	284616bd-952a-4c43-97b3-18af8119c6a4	dept-cs	APPROVED_HOD	{"category": "NON_TEACHING_STAFF", "mobileNo": "9876592844", "employeeId": "EMP1003", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_nts_3@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.667	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-23 03:24:35.592	2026-07-13 18:31:50.668	\N
add08b4f-83a5-4a7a-9b4d-981c198945b2	DEAN-APP-4-64638	77da8e71-b7f5-4c17-aba9-8a45f2e71609	dept-cs	APPROVED_HOD	{"category": "NON_TEACHING_STAFF", "mobileNo": "9876540218", "employeeId": "EMP1004", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_nts_4@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.675	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-19 05:20:42.469	2026-07-13 18:31:50.675	\N
e38ef1e3-22f6-468f-b85e-327e811f1c37	DEAN-APP-5-32859	7b2e54f6-4898-430a-8820-2502bd10e783	dept-cs	APPROVED_HOD	{"category": "NON_TEACHING_STAFF", "mobileNo": "9876553614", "employeeId": "EMP1005", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_nts_5@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.683	\N	\N	\N	\N	\N	\N	\N	\N	2026-03-26 09:49:43.279	2026-07-13 18:31:50.684	\N
f2426f1e-8f16-4185-9246-7a3b6fe88e47	DEAN-APP-6-35268	a806e960-bef3-45f6-b0cc-e3200d4503b7	dept-cs	REJECTED_HOD	{"category": "NON_TEACHING_STAFF", "mobileNo": "9876517510", "employeeId": "EMP1006", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_nts_6@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.692	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-07 02:30:20.093	2026-07-13 18:31:50.693	\N
ef6bd1ac-c278-4724-8adc-6b6dd10d4a78	DEAN-APP-7-94195	a90dd76f-2bfa-4e8a-babf-1c159f0c22a3	dept-cs	REJECTED_HOD	{"category": "NON_TEACHING_STAFF", "mobileNo": "9876527972", "employeeId": "EMP1007", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_nts_7@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.701	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-09 14:17:43.187	2026-07-13 18:31:50.702	\N
6f56e94c-25e9-4970-b0da-f66488eff773	DEAN-APP-8-56284	fea5b3f1-cddc-4840-abb5-585a1c8f4465	dept-cs	PROVISIONED	{"category": "NON_TEACHING_STAFF", "mobileNo": "9876573234", "employeeId": "EMP1008", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_nts_8@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.712	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-18 14:51:55.113	2026-07-13 18:31:50.713	\N
53f2062b-91d6-44b4-b3d5-562c18c6fa55	DEAN-APP-9-66260	3356ca19-da1b-4181-ad5e-f0c92aaba6d0	dept-cs	PROVISIONED	{"category": "NON_TEACHING_STAFF", "mobileNo": "9876528579", "employeeId": "EMP1009", "dateOfBirth": "1990-01-01", "designation": "Officer", "emailChoice": "dummy_nts_9@bhu.ac.in", "typeOfEmployment": "Permanent", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.721	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-11 12:18:57.457	2026-07-13 18:31:50.722	\N
3a997d8d-605f-45fa-83d7-b731347c4bd1	DEAN-APP-0-62446	d60a9a11-4289-4669-8c20-38fec172764a	dept-cs	PENDING_HOD	{"category": "RESEARCH_SCHOLAR", "mobileNo": "9876544771", "dateOfBirth": "1990-01-01", "emailChoice": "dummy_rs_0@bhu.ac.in", "enrollmentNo": "EN1000", "programEnrolled": "Ph.D.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-12 05:29:24.461	2026-07-13 18:31:50.729	\N
f8c043fc-8cb5-4dbe-8b47-8d9fa6da2509	DEAN-APP-1-27535	feeb6e2a-5d03-4131-82db-703219c6ab2a	dept-cs	PENDING_HOD	{"category": "RESEARCH_SCHOLAR", "mobileNo": "9876583485", "dateOfBirth": "1990-01-01", "emailChoice": "dummy_rs_1@bhu.ac.in", "enrollmentNo": "EN1001", "programEnrolled": "Ph.D.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-20 17:07:00.92	2026-07-13 18:31:50.735	\N
089dda8e-b400-478c-ae58-076502966827	DEAN-APP-2-87883	f90158e7-4e31-4235-9ffc-8498417dfd54	dept-cs	PENDING_HOD	{"category": "RESEARCH_SCHOLAR", "mobileNo": "9876524495", "dateOfBirth": "1990-01-01", "emailChoice": "dummy_rs_2@bhu.ac.in", "enrollmentNo": "EN1002", "programEnrolled": "Ph.D.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-22 06:02:06.282	2026-07-13 18:31:50.743	\N
30c5290b-a2d5-44a4-94ee-5703cebabaa7	DEAN-APP-3-94255	b696ac04-c227-43c7-938b-864bcec347fe	dept-cs	APPROVED_HOD	{"category": "RESEARCH_SCHOLAR", "mobileNo": "9876512571", "dateOfBirth": "1990-01-01", "emailChoice": "dummy_rs_3@bhu.ac.in", "enrollmentNo": "EN1003", "programEnrolled": "Ph.D.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.751	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-22 18:33:44.229	2026-07-13 18:31:50.752	\N
53c5c9b1-dd29-418f-ac41-ce8630e76c9a	DEAN-APP-4-79757	e5ef4833-4e5e-4352-9352-740faa229c93	dept-cs	APPROVED_HOD	{"category": "RESEARCH_SCHOLAR", "mobileNo": "9876589909", "dateOfBirth": "1990-01-01", "emailChoice": "dummy_rs_4@bhu.ac.in", "enrollmentNo": "EN1004", "programEnrolled": "Ph.D.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.76	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-31 14:19:51.643	2026-07-13 18:31:50.761	\N
e34ab76e-4fe6-470a-8312-de137cfa7ac0	DEAN-APP-5-99052	8ae8c9a7-8e38-48b2-b1dd-27d596e943cb	dept-cs	APPROVED_HOD	{"category": "RESEARCH_SCHOLAR", "mobileNo": "9876586305", "dateOfBirth": "1990-01-01", "emailChoice": "dummy_rs_5@bhu.ac.in", "enrollmentNo": "EN1005", "programEnrolled": "Ph.D.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.769	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-28 14:59:50.07	2026-07-13 18:31:50.769	\N
f1d1e232-aca1-4ccf-a984-2e18fa1804fc	DEAN-APP-6-58487	0929b71a-7e28-417a-9d47-45bdf3316628	dept-cs	REJECTED_HOD	{"category": "RESEARCH_SCHOLAR", "mobileNo": "9876559303", "dateOfBirth": "1990-01-01", "emailChoice": "dummy_rs_6@bhu.ac.in", "enrollmentNo": "EN1006", "programEnrolled": "Ph.D.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.775	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-01 10:11:25.711	2026-07-13 18:31:50.776	\N
a5267154-b472-477f-bee4-fbdd22660f73	DEAN-APP-7-88725	3d68f995-6e9a-4aee-ad5e-d94c3c7eacc3	dept-cs	REJECTED_HOD	{"category": "RESEARCH_SCHOLAR", "mobileNo": "9876574879", "dateOfBirth": "1990-01-01", "emailChoice": "dummy_rs_7@bhu.ac.in", "enrollmentNo": "EN1007", "programEnrolled": "Ph.D.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.785	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-23 11:14:49.679	2026-07-13 18:31:50.786	\N
30ce5de0-0e2b-4545-9a59-627b66047b5b	DEAN-APP-8-40130	89963643-3cd7-4542-9a0a-226cd02acacd	dept-cs	PROVISIONED	{"category": "RESEARCH_SCHOLAR", "mobileNo": "9876532010", "dateOfBirth": "1990-01-01", "emailChoice": "dummy_rs_8@bhu.ac.in", "enrollmentNo": "EN1008", "programEnrolled": "Ph.D.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.796	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-11 00:29:22.856	2026-07-13 18:31:50.797	\N
c133637c-4fcb-41aa-873d-a18c9e0a6669	DEAN-APP-9-44785	74493e2e-7a8b-45a1-823a-d7ea9eeedf34	dept-cs	PROVISIONED	{"category": "RESEARCH_SCHOLAR", "mobileNo": "9876592004", "dateOfBirth": "1990-01-01", "emailChoice": "dummy_rs_9@bhu.ac.in", "enrollmentNo": "EN1009", "programEnrolled": "Ph.D.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-05-16 21:38:30.803	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-30 11:09:56.632	2026-07-13 18:31:50.804	\N
12ce959f-f59e-43b8-b7fa-d55575584cd6	DEAN-APP-0-40698	64699791-3573-42df-91d5-6f6bd5d50096	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876597137", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_0@bhu.ac.in", "enrollmentNo": "EN_DEAN1000", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.819	\N	\N	\N	\N	\N	2026-05-22 12:00:39.675	2026-07-13 18:31:50.82	\N
18ec5105-9d94-4ccc-8f11-e8d6ab37c149	DEAN-APP-1-52099	bae55ca5-8b12-43d3-8f14-92d7a86e509c	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876526867", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_1@bhu.ac.in", "enrollmentNo": "EN_DEAN1001", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.827	\N	\N	\N	\N	\N	2026-04-16 04:11:43.726	2026-07-13 18:31:50.828	\N
6853e6ab-e24b-422d-a613-9e1900f756ff	DEAN-APP-2-80353	9afd190e-8b10-4013-b99c-e34232ef836b	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876566056", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_2@bhu.ac.in", "enrollmentNo": "EN_DEAN1002", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.837	\N	\N	\N	\N	\N	2026-04-08 16:22:43.622	2026-07-13 18:31:50.838	\N
e2a51d84-5a81-462c-b362-28892982aaff	DEAN-APP-3-49365	eac9cdb1-4b64-47a9-a922-cef17442335d	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876553829", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_3@bhu.ac.in", "enrollmentNo": "EN_DEAN1003", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.848	\N	\N	\N	\N	\N	2026-06-01 08:45:05.679	2026-07-13 18:31:50.849	\N
7a54f5c9-f1df-4d23-8699-86420b50a8c3	DEAN-APP-4-22921	048b17c7-7c51-4539-bab4-5a76bb346472	dept-cs	APPROVED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876536398", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_4@bhu.ac.in", "enrollmentNo": "EN_DEAN1004", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.857	\N	\N	\N	\N	\N	2026-07-08 13:48:51.248	2026-07-13 18:31:50.858	\N
e8a739bf-0ac5-4720-beb4-4c6e34e4c729	DEAN-APP-5-53762	2b2816f7-3924-4275-9b25-184d72ec643f	dept-cs	APPROVED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876519440", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_5@bhu.ac.in", "enrollmentNo": "EN_DEAN1005", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.868	\N	\N	\N	\N	\N	2026-05-10 04:27:20.687	2026-07-13 18:31:50.869	\N
d229a912-f14d-420c-8ec5-411322c2399c	DEAN-APP-6-63165	5fb7c345-2c87-489f-ac2c-086fb0dacf9d	dept-cs	APPROVED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876524139", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_6@bhu.ac.in", "enrollmentNo": "EN_DEAN1006", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.876	\N	\N	\N	\N	\N	2026-05-08 19:30:19.971	2026-07-13 18:31:50.877	\N
a5b7d154-7977-4f26-bc2e-55f6c0cf84f2	DEAN-APP-7-68890	12b7d1f1-4fde-4a79-a02c-2d0409a89bf4	dept-cs	REJECTED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876573425", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_7@bhu.ac.in", "enrollmentNo": "EN_DEAN1007", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.884	\N	\N	\N	\N	\N	2026-06-20 04:31:45.651	2026-07-13 18:31:50.885	\N
742be178-0feb-4573-8cad-b8aaf7f0c130	DEAN-APP-8-54553	99f9641d-ada2-408c-b0b4-f4a3225b6ae4	dept-cs	REJECTED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876535604", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_8@bhu.ac.in", "enrollmentNo": "EN_DEAN1008", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.892	\N	\N	\N	\N	\N	2026-04-20 20:11:46.619	2026-07-13 18:31:50.893	\N
dfcfde1e-be58-419b-a463-983fd4e31db8	DEAN-APP-9-27524	7ba2a110-1ec1-48ca-aec9-170c7d0542be	dept-cs	REJECTED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876510891", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_9@bhu.ac.in", "enrollmentNo": "EN_DEAN1009", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.9	\N	\N	\N	\N	\N	2026-06-25 20:43:13.298	2026-07-13 18:31:50.901	\N
3e875605-4d17-42e1-85e4-ae22948d0b61	DEAN-APP-10-18752	51dbd013-c6fc-4f13-b74b-2a33d4018fe9	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876551305", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_10@bhu.ac.in", "enrollmentNo": "EN_DEAN1010", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.907	\N	\N	\N	\N	\N	2026-06-24 09:35:23.935	2026-07-13 18:31:50.908	\N
0beb4b08-df67-480d-839a-54bdb16de115	DEAN-APP-11-33575	2b271aaa-27ca-444f-a3f4-3188f150d825	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876576809", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_11@bhu.ac.in", "enrollmentNo": "EN_DEAN1011", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.915	\N	\N	\N	\N	\N	2026-05-30 05:01:55.956	2026-07-13 18:31:50.915	\N
d785fe49-8496-40d4-9c78-9e5ac8c80c2f	DEAN-APP-12-96500	1b34406b-4053-41a6-a904-936031ab7eed	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876553072", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_12@bhu.ac.in", "enrollmentNo": "EN_DEAN1012", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.922	\N	\N	\N	\N	\N	2026-06-18 19:51:35.5	2026-07-13 18:31:50.923	\N
533a73b8-6f1b-4ac3-950b-a010780594d0	DEAN-APP-13-18278	52865496-7ee0-4bfd-b98b-5b82c7a50d05	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876569576", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_13@bhu.ac.in", "enrollmentNo": "EN_DEAN1013", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.934	\N	\N	\N	\N	\N	2026-04-01 12:04:29.506	2026-07-13 18:31:50.935	\N
75be7b2e-ff6a-4fd7-aa95-80f66db747e2	DEAN-APP-14-63988	70d44729-ee3e-4c3f-8e00-c374f8a7a88c	dept-cs	APPROVED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876532977", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_14@bhu.ac.in", "enrollmentNo": "EN_DEAN1014", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.942	\N	\N	\N	\N	\N	2026-05-02 22:27:04.118	2026-07-13 18:31:50.943	\N
6b018acf-07e4-4e5a-87b1-77c59a5338ce	DEAN-APP-15-43968	4f8f561a-5eed-4f5d-9ff6-72d2c0c31850	dept-cs	APPROVED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876556215", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_15@bhu.ac.in", "enrollmentNo": "EN_DEAN1015", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.95	\N	\N	\N	\N	\N	2026-05-18 20:42:56.974	2026-07-13 18:31:50.951	\N
528cf693-b66a-4e7e-9ec4-c63d7565d07c	DEAN-APP-16-39213	a2c4ccdb-79b2-40ee-87b5-1b3f0de93f5e	dept-cs	APPROVED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876574772", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_16@bhu.ac.in", "enrollmentNo": "EN_DEAN1016", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.957	\N	\N	\N	\N	\N	2026-05-23 15:02:04.396	2026-07-13 18:31:50.958	\N
db1a386a-6997-400f-a7d8-5ca41942380b	DEAN-APP-17-12101	8a37c105-f917-476a-b031-7532a6ad4b04	dept-cs	REJECTED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876543794", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_17@bhu.ac.in", "enrollmentNo": "EN_DEAN1017", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.965	\N	\N	\N	\N	\N	2026-07-03 22:58:44.696	2026-07-13 18:31:50.966	\N
a944bd29-d60f-4656-8419-883c3ebdb2d6	DEAN-APP-18-39935	92f42a82-c887-4ff5-96c6-8d7bf871536e	dept-cs	REJECTED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876510162", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_18@bhu.ac.in", "enrollmentNo": "EN_DEAN1018", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.973	\N	\N	\N	\N	\N	2026-07-04 10:10:46.271	2026-07-13 18:31:50.973	\N
73109eed-d1ce-497b-ab7c-b7b9e6c06214	DEAN-APP-19-55088	63dbf85f-2941-47b1-9f01-945c557ad2b2	dept-cs	REJECTED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876570926", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_19@bhu.ac.in", "enrollmentNo": "EN_DEAN1019", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.982	\N	\N	\N	\N	\N	2026-05-18 11:37:15.313	2026-07-13 18:31:50.982	\N
9b5c9141-0599-48e1-8431-cfacdafdc578	DEAN-APP-20-55961	ec8786a7-3532-4e13-ad57-6a42cd91c2be	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876596900", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_20@bhu.ac.in", "enrollmentNo": "EN_DEAN1020", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.989	\N	\N	\N	\N	\N	2026-05-15 18:27:32.124	2026-07-13 18:31:50.99	\N
b29a9e25-1dea-4ba4-a748-d43179ad0c23	DEAN-APP-21-68103	38024cb1-0663-4890-a47d-7fff5929d649	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876576254", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_21@bhu.ac.in", "enrollmentNo": "EN_DEAN1021", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:30.997	\N	\N	\N	\N	\N	2026-03-29 14:22:31.182	2026-07-13 18:31:50.998	\N
5ff55b4a-0b7c-4740-90c7-2017e0ae8583	DEAN-APP-22-55306	f9f2150a-9a56-48ce-a24b-b9f633da2c74	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876522655", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_22@bhu.ac.in", "enrollmentNo": "EN_DEAN1022", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.005	\N	\N	\N	\N	\N	2026-05-23 19:51:31.777	2026-07-13 18:31:51.006	\N
a8230fef-4317-4c87-b7b7-0917a43e65c3	DEAN-APP-23-87095	6c34a0f1-75a4-41aa-b9f3-52db39fc9748	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876599864", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_23@bhu.ac.in", "enrollmentNo": "EN_DEAN1023", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.014	\N	\N	\N	\N	\N	2026-05-18 03:31:31.018	2026-07-13 18:31:51.015	\N
4f2ee8b1-bedd-4691-8f7c-078cf9c848db	DEAN-APP-24-29126	3a09db79-6ec3-4ef1-a244-2b45e0ee81b0	dept-cs	APPROVED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876559493", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_24@bhu.ac.in", "enrollmentNo": "EN_DEAN1024", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.024	\N	\N	\N	\N	\N	2026-06-06 03:48:07.081	2026-07-13 18:31:51.025	\N
bd19145e-0f93-4130-acda-998beb6cfe5d	DEAN-APP-25-29063	ced34417-780f-4da2-91de-b8a2306ec0d6	dept-cs	APPROVED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876598100", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_25@bhu.ac.in", "enrollmentNo": "EN_DEAN1025", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.033	\N	\N	\N	\N	\N	2026-03-27 23:55:43.054	2026-07-13 18:31:51.034	\N
b39918d5-14aa-4a92-ab7d-3d5e980a73c0	DEAN-APP-26-34681	d5dbf537-5cca-49c0-b8e1-3933cae13909	dept-cs	APPROVED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876597438", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_26@bhu.ac.in", "enrollmentNo": "EN_DEAN1026", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.041	\N	\N	\N	\N	\N	2026-05-24 07:42:12.987	2026-07-13 18:31:51.042	\N
77543b8c-b80b-40f3-b88c-14c9a32dfb43	DEAN-APP-27-91711	52642950-dcc8-4840-ba5a-4174a8e0c9a2	dept-cs	REJECTED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876589780", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_27@bhu.ac.in", "enrollmentNo": "EN_DEAN1027", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.05	\N	\N	\N	\N	\N	2026-06-04 03:20:17.813	2026-07-13 18:31:51.05	\N
9117215d-5118-46dd-86f0-d924b710ecbf	DEAN-APP-28-74523	02d8a2d6-cb40-4d8b-9ca8-046711f351b0	dept-cs	REJECTED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876580971", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_28@bhu.ac.in", "enrollmentNo": "EN_DEAN1028", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.057	\N	\N	\N	\N	\N	2026-06-02 20:07:49.287	2026-07-13 18:31:51.058	\N
4170d1b6-1d4a-44a3-84d9-e1367a11590f	DEAN-APP-29-92287	d2d4c832-60e1-4854-836b-db6abe92df15	dept-cs	REJECTED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876564167", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_29@bhu.ac.in", "enrollmentNo": "EN_DEAN1029", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.064	\N	\N	\N	\N	\N	2026-03-29 07:34:01.039	2026-07-13 18:31:51.065	\N
aecb1563-dec4-4e7e-b7ea-04c82809ca96	DEAN-APP-30-36097	6fe6f148-d068-4d7e-a47c-b8ef744784f9	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876568199", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_30@bhu.ac.in", "enrollmentNo": "EN_DEAN1030", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.071	\N	\N	\N	\N	\N	2026-05-20 20:50:41.836	2026-07-13 18:31:51.072	\N
5115d524-35c5-47d5-8468-f1197650a505	DEAN-APP-31-27847	7fa05e92-4b4d-45b8-896c-520c82699723	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876527143", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_31@bhu.ac.in", "enrollmentNo": "EN_DEAN1031", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.079	\N	\N	\N	\N	\N	2026-06-21 06:27:07.59	2026-07-13 18:31:51.08	\N
e36bf722-50a5-4397-8e3d-c247003a40b5	DEAN-APP-32-65783	f1f0f74e-d781-461c-b9aa-1bb518966167	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876588691", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_32@bhu.ac.in", "enrollmentNo": "EN_DEAN1032", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.086	\N	\N	\N	\N	\N	2026-07-07 11:42:17.449	2026-07-13 18:31:51.087	\N
d1f70132-5c4c-49a9-b177-c187ddc57498	DEAN-APP-33-15732	5dcabe29-bc5d-4058-9c18-4d30923ed4f6	dept-cs	PENDING_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876597515", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_33@bhu.ac.in", "enrollmentNo": "EN_DEAN1033", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.093	\N	\N	\N	\N	\N	2026-05-11 08:26:16.95	2026-07-13 18:31:51.094	\N
bf98ec01-4345-47d3-b460-181ce6eb637e	DEAN-APP-34-99621	79173bc3-020b-441e-8fc5-1f5d4f376f53	dept-cs	APPROVED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876515674", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_34@bhu.ac.in", "enrollmentNo": "EN_DEAN1034", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.101	\N	\N	\N	\N	\N	2026-05-09 15:08:36.893	2026-07-13 18:31:51.101	\N
714e52ca-944f-4826-966c-7cee82149c1d	DEAN-APP-35-51202	97a45688-2595-4ef8-86d4-062f8004367e	dept-cs	APPROVED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876555282", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_35@bhu.ac.in", "enrollmentNo": "EN_DEAN1035", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.108	\N	\N	\N	\N	\N	2026-04-14 23:54:16.844	2026-07-13 18:31:51.109	\N
bf688172-ea6e-49ee-aefe-a617d2de0c8b	DEAN-APP-36-91038	096c2184-4e6b-4402-936b-456066866a12	dept-cs	APPROVED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876574430", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_36@bhu.ac.in", "enrollmentNo": "EN_DEAN1036", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.116	\N	\N	\N	\N	\N	2026-06-20 11:02:42.423	2026-07-13 18:31:51.117	\N
421e139e-d06f-4f8f-83be-eddf623d3c11	DEAN-APP-37-23405	4c1c661d-66ce-47fe-aaa5-eba4b5df5532	dept-cs	REJECTED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876595570", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_37@bhu.ac.in", "enrollmentNo": "EN_DEAN1037", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.124	\N	\N	\N	\N	\N	2026-06-27 08:01:20.327	2026-07-13 18:31:51.125	\N
cf6aeca3-422e-4513-ae8d-b3bdf335351c	DEAN-APP-38-72911	92de2a6c-22cb-4aee-aef7-4c5754488183	dept-cs	REJECTED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876592210", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_38@bhu.ac.in", "enrollmentNo": "EN_DEAN1038", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.132	\N	\N	\N	\N	\N	2026-06-21 19:15:31.576	2026-07-13 18:31:51.133	\N
854d7003-3cbe-47ba-bac6-763fbe306a75	DEAN-APP-39-66738	31862e03-661d-4de3-ba27-f15158060309	dept-cs	REJECTED_DEAN	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "9876541147", "dateOfBirth": "2004-01-01", "emailChoice": "dummy_dean_ug_39@bhu.ac.in", "enrollmentNo": "EN_DEAN1039", "programEnrolled": "B.Sc.", "facultyInstituteCentre": "Computer Science"}	/dummy/photo.jpg	/dummy/signature.jpg	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-05-16 21:38:31.141	\N	\N	\N	\N	\N	2026-07-04 04:32:18.341	2026-07-13 18:31:51.142	\N
d65fea91-ca8f-4603-b813-a3579d68c3a5	BHU-20260714-7077	fa9d2f04-24d8-4d75-b0f8-4d79b57a6ee8	dept-cs	SUSPENDED	{"category": "GROUP_A_OFFICER", "mobileNo": "+27-849161592", "employeeId": "548488", "dateOfBirth": "2005-02-01", "designation": "abcd", "nationality": "United States", "emailChoice1": "user", "emailChoice2": "test", "emailChoice3": "sfg", "applicantPlace": "LUCKNOW", "dateOfRetirement": "2026-07-30", "typeOfEmployment": "Contractual", "dateOfAppointment": "2026-07-13", "facultyInstituteCentre": "teaching"}	uploads/photo-1784009860583-b1c15470.jpg	uploads/sig-1784009860594-bab01bbe.png	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-07-14 07:14:50.598	\N	\N	\N	8e564f4a35270d273d5d03e34469133d58d22f7c3b199a7da64750dece67ef5b	uploads/approved-pdfs/BHU-20260714-7077_Approved.pdf	pata nhi\n	\N	\N	2026-07-14 06:17:40.674	2026-07-14 07:18:31.671	\N
b9c05483-dd8b-4737-ad87-8a9bb37f5391	BHU-20260714-5083	7c561a6a-62ea-4047-9b80-d02df50ba2cf	dept-cs	PROVISIONED	{"category": "UNDER_GRADUATE_STUDENT", "mobileNo": "+91-4452014702", "dateOfBirth": "2004-02-03", "nationality": "India", "emailChoice1": "user", "emailChoice2": "kjkxnakljz", "emailChoice3": "kgukyug", "enrollmentNo": "249528", "applicantPlace": "LUCKNOW", "programEnrolled": "b.tech", "courseCompletionYear": "2028", "admissionAcademicYear": "2024", "facultyInstituteCentre": "teaching"}	uploads/photo-1784013897552-669d3398.jpg	uploads/sig-1784013897555-6854d4f9.png	\N	\N	\N	eeddb80d-9043-41f0-9ef7-630f34417d65	\N	2026-07-14 07:26:00.511	4c0b6eca4b8dd8f1ec9aee8a971ca7b6c77f86d198245708cd01921c5349cb11	uploads/approved-pdfs/BHU-20260714-5083_Approved.pdf	Account provisioned: sonu.compsci.2026@bhu.ac.in	2026-07-14 07:34:35.641	5	2026-07-14 07:24:57.608	2026-07-14 07:34:35.643	\N
5d20e01e-2978-4237-aff0-e80aed14f919	BHU-20260714-4607	5b7e9196-16e6-4f20-a4d0-a117f0f14e42	dept-cs	PROVISIONED	{"category": "RESEARCH_SCHOLAR", "mobileNo": "+7-4452014702", "dateOfBirth": "2004-02-03", "nationality": "India", "emailChoice1": "user", "emailChoice2": "kjkxnakljz", "emailChoice3": "kgukyug", "enrollmentNo": "249528", "applicantPlace": "LUCKNOW", "programEnrolled": "b.tech", "courseCompletionYear": "2028", "admissionAcademicYear": "2026", "facultyInstituteCentre": "teaching"}	uploads/photo-1784019942363-ef1c2661.jpg	uploads/sig-1784019942364-97f438f4.png	ff38fe65-3f77-4a0b-884d-1682cbe592b9	\N	2026-07-14 09:06:12.067	\N	\N	\N	26de06cb9055f2c0e4592db3499d7384b3af938b3c6d37534f780b2da45d480d	uploads/approved-pdfs/BHU-20260714-4607_Approved.pdf	\N	\N	\N	2026-07-14 09:05:42.416	2026-07-14 09:07:05.231	\N
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: bhu_user
--

COPY public."AuditLog" (id, "entityType", "entityId", action, "performedBy", "ipAddress", payload, "createdAt") FROM stdin;
a29b36e7-df3e-4ad6-83b3-7dc3f39d6c74	APPLICATION	d65fea91-ca8f-4603-b813-a3579d68c3a5	APPLICATION_SUBMITTED	fa9d2f04-24d8-4d75-b0f8-4d79b57a6ee8	::ffff:172.20.0.1	{"status": "PENDING_HOD"}	2026-07-14 06:17:40.708
49d61567-7806-4dba-a75a-79d6a6f4f4f7	APPLICATION	d65fea91-ca8f-4603-b813-a3579d68c3a5	STATUS_CHANGED_TO_APPROVED_HOD	ff38fe65-3f77-4a0b-884d-1682cbe592b9	::ffff:172.20.0.1	{"newStatus": "APPROVED_HOD", "previousStatus": "PENDING_HOD", "digitalSignatureHash": "8e564f4a35270d273d5d03e34469133d58d22f7c3b199a7da64750dece67ef5b"}	2026-07-14 07:14:50.619
4a3ace3b-16c3-47f9-a558-227bd43d7898	APPLICATION	d65fea91-ca8f-4603-b813-a3579d68c3a5	STATUS_CHANGED_TO_PROVISIONED	806864d3-a49f-498f-880b-c74e8b5454da	::ffff:172.20.0.1	{"newStatus": "PROVISIONED", "previousStatus": "APPROVED_HOD"}	2026-07-14 07:18:04.49
8d7a818e-8d84-4e0a-8c6f-4136b5eed8b3	APPLICATION	d65fea91-ca8f-4603-b813-a3579d68c3a5	ACCOUNT_SUSPENDED	806864d3-a49f-498f-880b-c74e8b5454da	::ffff:172.20.0.1	{"remarks": "pata nhi\\n", "previousStatus": "PROVISIONED"}	2026-07-14 07:18:31.682
ea0cb3bd-a2e6-4131-8d90-b4d7e67bd731	APPLICATION	b9c05483-dd8b-4737-ad87-8a9bb37f5391	APPLICATION_SUBMITTED	7c561a6a-62ea-4047-9b80-d02df50ba2cf	::ffff:172.20.0.1	{"status": "PENDING_DEAN"}	2026-07-14 07:24:57.627
2d17ada8-033b-4926-b738-eaad6fdfda42	APPLICATION	b9c05483-dd8b-4737-ad87-8a9bb37f5391	STATUS_CHANGED_TO_APPROVED_DEAN	eeddb80d-9043-41f0-9ef7-630f34417d65	::ffff:172.20.0.1	{"newStatus": "APPROVED_DEAN", "previousStatus": "PENDING_DEAN", "digitalSignatureHash": "4c0b6eca4b8dd8f1ec9aee8a971ca7b6c77f86d198245708cd01921c5349cb11"}	2026-07-14 07:26:00.518
2ab8a503-416f-45d7-a4f6-97c4b9b66c40	APPLICATION	b9c05483-dd8b-4737-ad87-8a9bb37f5391	ACCOUNT_PROVISIONED	806864d3-a49f-498f-880b-c74e8b5454da	::ffff:172.20.0.1	{"quotaGB": 5, "bhuEmail": "sonu.compsci.2026@bhu.ac.in", "applicantAlternateEmail": "riddhijaiswal2026@gmail.com"}	2026-07-14 07:34:35.656
14b4612e-8fd6-4a2c-a25e-5ed6c16999c9	USER	7c561a6a-62ea-4047-9b80-d02df50ba2cf	PASSWORD_RESET	806864d3-a49f-498f-880b-c74e8b5454da	::ffff:172.20.0.1	{"bhuEmail": "sonu.compsci.2026@bhu.ac.in", "applicationId": "b9c05483-dd8b-4737-ad87-8a9bb37f5391"}	2026-07-14 07:52:44.881
60e1c5b5-4e69-4cd9-bbd2-f11d9a4d88e3	APPLICATION	5d20e01e-2978-4237-aff0-e80aed14f919	APPLICATION_SUBMITTED	5b7e9196-16e6-4f20-a4d0-a117f0f14e42	::ffff:172.20.0.1	{"status": "PENDING_HOD"}	2026-07-14 09:05:42.452
9c017b74-f2df-4ee8-97db-4dc05bc2babc	APPLICATION	5d20e01e-2978-4237-aff0-e80aed14f919	STATUS_CHANGED_TO_APPROVED_HOD	ff38fe65-3f77-4a0b-884d-1682cbe592b9	::ffff:172.20.0.1	{"newStatus": "APPROVED_HOD", "previousStatus": "PENDING_HOD", "digitalSignatureHash": "26de06cb9055f2c0e4592db3499d7384b3af938b3c6d37534f780b2da45d480d"}	2026-07-14 09:06:12.077
c360bdd0-0a06-423c-9804-3cef2a4fb04c	APPLICATION	5d20e01e-2978-4237-aff0-e80aed14f919	STATUS_CHANGED_TO_PROVISIONED	806864d3-a49f-498f-880b-c74e8b5454da	::ffff:172.20.0.1	{"newStatus": "PROVISIONED", "previousStatus": "APPROVED_HOD"}	2026-07-14 09:07:05.246
\.


--
-- Data for Name: Department; Type: TABLE DATA; Schema: public; Owner: bhu_user
--

COPY public."Department" (id, code, name, "hodId", "deanId") FROM stdin;
dept-adult-continuing-education---extension	ADULT_CONTINUING_EDUCATION___E	Adult Continuing Education & Extension	\N	\N
dept-agricultural-economics	AGRICULTURAL_ECONOMICS	Agricultural Economics	\N	\N
dept-agricultural-engineering	AGRICULTURAL_ENGINEERING	Agricultural Engineering	\N	\N
dept-agricultural-extension-and-communication	AGRICULTURAL_EXTENSION_AND_COM	Agricultural Extension and Communication	\N	\N
dept-agronomy	AGRONOMY	Agronomy	\N	\N
dept-anatomy	ANATOMY	Anatomy	\N	\N
dept-ancient-indian-history--culture---archaeology	ANCIENT_INDIAN_HISTORY__CULTUR	Ancient Indian History, Culture & Archaeology	\N	\N
dept-animal-husbandry-and-dairying	ANIMAL_HUSBANDRY_AND_DAIRYING	Animal Husbandry and Dairying	\N	\N
dept-applied-arts	APPLIED_ARTS	Applied Arts	\N	\N
dept-applied-chemistry	APPLIED_CHEMISTRY	Applied Chemistry	\N	\N
dept-applied-mathematics	APPLIED_MATHEMATICS	Applied Mathematics	\N	\N
dept-applied-physics	APPLIED_PHYSICS	Applied Physics	\N	\N
dept-arabic	ARABIC	Arabic	\N	\N
dept-architecture--planning-and-design	ARCHITECTURE__PLANNING_AND_DES	Architecture, Planning and Design	\N	\N
dept-astrology--jyotish-	ASTROLOGY__JYOTISH	Astrology (Jyotish)	\N	\N
dept-audiology-and-speech-language-pathology	AUDIOLOGY_AND_SPEECH_LANGUAGE	Audiology and Speech Language Pathology	\N	\N
dept-ayurveda--dravyaguna-	AYURVEDA__DRAVYAGUNA	Ayurveda (Dravyaguna)	\N	\N
dept-ayurveda--kayachikitsa-	AYURVEDA__KAYACHIKITSA	Ayurveda (Kayachikitsa)	\N	\N
dept-ayurveda--kaumarbhritya-	AYURVEDA__KAUMARBHRITYA	Ayurveda (Kaumarbhritya)	\N	\N
dept-ayurveda--prasuti-tantra-	AYURVEDA__PRASUTI_TANTRA	Ayurveda (Prasuti Tantra)	\N	\N
dept-ayurveda--rasa-shastra-	AYURVEDA__RASA_SHASTRA	Ayurveda (Rasa Shastra)	\N	\N
dept-ayurveda--samhita---sanskrit-	AYURVEDA__SAMHITA___SANSKRIT	Ayurveda (Samhita & Sanskrit)	\N	\N
dept-ayurveda--shalakya-tantra-	AYURVEDA__SHALAKYA_TANTRA	Ayurveda (Shalakya Tantra)	\N	\N
dept-ayurveda--shalya-tantra-	AYURVEDA__SHALYA_TANTRA	Ayurveda (Shalya Tantra)	\N	\N
dept-ayurveda--vikriti-vigyan-	AYURVEDA__VIKRITI_VIGYAN	Ayurveda (Vikriti Vigyan)	\N	\N
dept-bengali	BENGALI	Bengali	\N	\N
dept-biochemistry	BIOCHEMISTRY	Biochemistry	\N	\N
dept-biophysics	BIOPHYSICS	Biophysics	\N	\N
dept-botany	BOTANY	Botany	\N	\N
dept-business-management	BUSINESS_MANAGEMENT	Business Management	\N	\N
dept-cardiac-anesthesiology	CARDIAC_ANESTHESIOLOGY	Cardiac Anesthesiology	\N	\N
dept-cardiology	CARDIOLOGY	Cardiology	\N	\N
dept-cardiothoracic-surgery	CARDIOTHORACIC_SURGERY	Cardiothoracic Surgery	\N	\N
dept-center-for-biomedical-engineering	CENTER_FOR_BIOMEDICAL_ENGINEER	Center for Biomedical Engineering	\N	\N
dept-center-for-genetic-disorders	CENTER_FOR_GENETIC_DISORDERS	Center for Genetic Disorders	\N	\N
dept-center-for-interdisciplinary-mathematical-sciences	CENTER_FOR_INTERDISCIPLINARY_M	Center for Interdisciplinary Mathematical Sciences	\N	\N
dept-center-for-women-s-studies	CENTER_FOR_WOMEN_S_STUDIES	Center for Women’s Studies	\N	\N
dept-chemical-engineering	CHEMICAL_ENGINEERING	Chemical Engineering	\N	\N
dept-chemistry	CHEMISTRY	Chemistry	\N	\N
dept-civil-engineering	CIVIL_ENGINEERING	Civil Engineering	\N	\N
dept-clinical-psychology	CLINICAL_PSYCHOLOGY	Clinical Psychology	\N	\N
dept-commerce	COMMERCE	Commerce	\N	\N
dept-community-medicine	COMMUNITY_MEDICINE	Community Medicine	\N	\N
dept-computer-science---engineering	COMPUTER_SCIENCE___ENGINEERING	Computer Science & Engineering	\N	\N
dept-conservative-dentistry	CONSERVATIVE_DENTISTRY	Conservative Dentistry	\N	\N
dept-dairy-science---food-technology	DAIRY_SCIENCE___FOOD_TECHNOLOG	Dairy Science & Food Technology	\N	\N
dept-dance--kathak-bharatnatyam-	DANCE__KATHAK_BHARATNATYAM	Dance (Kathak/Bharatnatyam)	\N	\N
dept-dermatology	DERMATOLOGY	Dermatology	\N	\N
dept-dharmagama	DHARMAGAMA	Dharmagama	\N	\N
dept-dharamshastra	DHARAMSHASTRA	Dharamshastra	\N	\N
dept-economics	ECONOMICS	Economics	\N	\N
dept-education	EDUCATION	Education	\N	\N
dept-electrical-engineering	ELECTRICAL_ENGINEERING	Electrical Engineering	\N	\N
dept-electronics-engineering	ELECTRONICS_ENGINEERING	Electronics Engineering	\N	\N
dept-endocrinology---metabolism	ENDOCRINOLOGY___METABOLISM	Endocrinology & Metabolism	\N	\N
dept-english	ENGLISH	English	\N	\N
dept-entomology-and-agricultural-zoology	ENTOMOLOGY_AND_AGRICULTURAL_ZO	Entomology and Agricultural Zoology	\N	\N
dept-environmental-science	ENVIRONMENTAL_SCIENCE	Environmental Science	\N	\N
dept-farm-engineering	FARM_ENGINEERING	Farm Engineering	\N	\N
dept-forensic-medicine	FORENSIC_MEDICINE	Forensic Medicine	\N	\N
dept-gastroenterology	GASTROENTEROLOGY	Gastroenterology	\N	\N
dept-genetics-and-plant-breeding	GENETICS_AND_PLANT_BREEDING	Genetics and Plant Breeding	\N	\N
dept-geography	GEOGRAPHY	Geography	\N	\N
dept-geology	GEOLOGY	Geology	\N	\N
dept-geophysics	GEOPHYSICS	Geophysics	\N	\N
dept-geriatric-medicine	GERIATRIC_MEDICINE	Geriatric Medicine	\N	\N
dept-gujarati	GUJARATI	Gujarati	\N	\N
dept-hematology	HEMATOLOGY	Hematology	\N	\N
dept-hindi	HINDI	Hindi	\N	\N
dept-history	HISTORY	History	\N	\N
dept-horticulture	HORTICULTURE	Horticulture	\N	\N
dept-hospital-administration	HOSPITAL_ADMINISTRATION	Hospital Administration	\N	\N
dept-human-molecular-genetics	HUMAN_MOLECULAR_GENETICS	Human Molecular Genetics	\N	\N
dept-indian-languages	INDIAN_LANGUAGES	Indian Languages	\N	\N
dept-instrumental-music--sitar--violin--tabla--flute-	INSTRUMENTAL_MUSIC__SITAR__VIO	Instrumental Music (Sitar, Violin, Tabla, Flute)	\N	\N
dept-journalism-and-mass-communication	JOURNALISM_AND_MASS_COMMUNICAT	Journalism and Mass Communication	\N	\N
dept-law	LAW	Law	\N	\N
dept-library-and-information-science	LIBRARY_AND_INFORMATION_SCIENC	Library and Information Science	\N	\N
dept-linguistics	LINGUISTICS	Linguistics	\N	\N
dept-malaviya-center-for-ethics-and-human-values	MALAVIYA_CENTER_FOR_ETHICS_AND	Malaviya Center for Ethics and Human Values	\N	\N
dept-marathi	MARATHI	Marathi	\N	\N
dept-accounting	DEACTIVATED_ACCOUNTING	Accounting	\N	\N
dept-materials-science---technology	MATERIALS_SCIENCE___TECHNOLOGY	Materials Science & Technology	\N	\N
dept-mathematics	MATHEMATICS	Mathematics	\N	\N
dept-mechanical-engineering	MECHANICAL_ENGINEERING	Mechanical Engineering	\N	\N
dept-medical-genetics	MEDICAL_GENETICS	Medical Genetics	\N	\N
dept-medicine	MEDICINE	Medicine	\N	\N
dept-metallurgical-engineering	METALLURGICAL_ENGINEERING	Metallurgical Engineering	\N	\N
dept-microbiology	MICROBIOLOGY	Microbiology	\N	\N
dept-mining-engineering	MINING_ENGINEERING	Mining Engineering	\N	\N
dept-molecular-and-human-genetics	MOLECULAR_AND_HUMAN_GENETICS	Molecular and Human Genetics	\N	\N
dept-musicology	MUSICOLOGY	Musicology	\N	\N
dept-nephrology	NEPHROLOGY	Nephrology	\N	\N
dept-neurology	NEUROLOGY	Neurology	\N	\N
dept-neuro-surgery	NEURO_SURGERY	Neuro Surgery	\N	\N
dept-nuclear-medicine	NUCLEAR_MEDICINE	Nuclear Medicine	\N	\N
dept-nursing	NURSING	Nursing	\N	\N
dept-obstetrics---gynaecology	OBSTETRICS___GYNAECOLOGY	Obstetrics & Gynaecology	\N	\N
dept-ophthalmology	OPHTHALMOLOGY	Ophthalmology	\N	\N
dept-oral-and-maxillofacial-surgery	ORAL_AND_MAXILLOFACIAL_SURGERY	Oral and Maxillofacial Surgery	\N	\N
dept-oral-medicine-and-radiology	ORAL_MEDICINE_AND_RADIOLOGY	Oral Medicine and Radiology	\N	\N
dept-orthodontics	ORTHODONTICS	Orthodontics	\N	\N
dept-orthopaedics	ORTHOPAEDICS	Orthopaedics	\N	\N
dept-otolaryngology--ent-	OTOLARYNGOLOGY__ENT	Otolaryngology (ENT)	\N	\N
dept-paediatrics	PAEDIATRICS	Paediatrics	\N	\N
dept-paediatric-surgery	PAEDIATRIC_SURGERY	Paediatric Surgery	\N	\N
dept-pain-management	PAIN_MANAGEMENT	Pain Management	\N	\N
dept-pali---buddhist-studies	PALI___BUDDHIST_STUDIES	Pali & Buddhist Studies	\N	\N
dept-painting	PAINTING	Painting	\N	\N
dept-pathology	PATHOLOGY	Pathology	\N	\N
dept-periodontics	PERIODONTICS	Periodontics	\N	\N
dept-persian	PERSIAN	Persian	\N	\N
dept-pharmaceutical-engineering---technology	PHARMACEUTICAL_ENGINEERING___T	Pharmaceutical Engineering & Technology	\N	\N
dept-pharmacology	PHARMACOLOGY	Pharmacology	\N	\N
dept-philosophy	PHILOSOPHY	Philosophy	\N	\N
dept-physical-education	PHYSICAL_EDUCATION	Physical Education	\N	\N
dept-physics	PHYSICS	Physics	\N	\N
dept-physiology	PHYSIOLOGY	Physiology	\N	\N
dept-plant-pathology	PLANT_PATHOLOGY	Plant Pathology	\N	\N
dept-plant-physiology	PLANT_PHYSIOLOGY	Plant Physiology	\N	\N
dept-plastic-arts	PLASTIC_ARTS	Plastic Arts	\N	\N
dept-plastic-surgery	PLASTIC_SURGERY	Plastic Surgery	\N	\N
dept-political-science	POLITICAL_SCIENCE	Political Science	\N	\N
dept-pottery-and-ceramics	POTTERY_AND_CERAMICS	Pottery and Ceramics	\N	\N
dept-prosthodontics	PROSTHODONTICS	Prosthodontics	\N	\N
dept-psychiatric-social-work	PSYCHIATRIC_SOCIAL_WORK	Psychiatric Social Work	\N	\N
dept-psychiatry	PSYCHIATRY	Psychiatry	\N	\N
dept-psychology	PSYCHOLOGY	Psychology	\N	\N
dept-pulmonary-medicine	PULMONARY_MEDICINE	Pulmonary Medicine	\N	\N
dept-radiodiagnosis	RADIODIAGNOSIS	Radiodiagnosis	\N	\N
dept-radiotherapy	RADIOTHERAPY	Radiotherapy	\N	\N
dept-sanskrit	SANSKRIT	Sanskrit	\N	\N
dept-social-work	SOCIAL_WORK	Social Work	\N	\N
dept-sociology	SOCIOLOGY	Sociology	\N	\N
dept-soil-science-and-agricultural-chemistry	SOIL_SCIENCE_AND_AGRICULTURAL	Soil Science and Agricultural Chemistry	\N	\N
dept-statistics	STATISTICS	Statistics	\N	\N
dept-surgical-oncology	SURGICAL_ONCOLOGY	Surgical Oncology	\N	\N
dept-tamil	TAMIL	Tamil	\N	\N
dept-telugu	TELUGU	Telugu	\N	\N
dept-textile-design	TEXTILE_DESIGN	Textile Design	\N	\N
dept-thoracic-surgery	THORACIC_SURGERY	Thoracic Surgery	\N	\N
dept-transfusion-medicine	TRANSFUSION_MEDICINE	Transfusion Medicine	\N	\N
dept-urology	UROLOGY	Urology	\N	\N
dept-urdu	URDU	Urdu	\N	\N
dept-ved	VED	Ved	\N	\N
dept-visual-arts	VISUAL_ARTS	Visual Arts	\N	\N
dept-vocal-music	VOCAL_MUSIC	Vocal Music	\N	\N
dept-vyakaran	VYAKARAN	Vyakaran	\N	\N
dept-yoga-sadhana-kendra	YOGA_SADHANA_KENDRA	Yoga Sadhana Kendra	\N	\N
dept-zoology	ZOOLOGY	Zoology	\N	\N
dept-cs	COMP_SCI	Computer Science	ff38fe65-3f77-4a0b-884d-1682cbe592b9	eeddb80d-9043-41f0-9ef7-630f34417d65
\.


--
-- Data for Name: DepartmentRequest; Type: TABLE DATA; Schema: public; Owner: bhu_user
--

COPY public."DepartmentRequest" (id, "requestedName", "applicantId", status, "adminRemarks", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: OtpVerification; Type: TABLE DATA; Schema: public; Owner: bhu_user
--

COPY public."OtpVerification" (id, email, "otpHash", "expiresAt", attempts, "createdAt") FROM stdin;
68b5da80-e021-4dc3-bbe7-73f43edf7e8c	qaz@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$LyvFa7+uTtimHna0st53Dg$fn5GJenKTDkOU47kco5GAxQy3GkEeIVHj7bVJ5f6Dhg	2026-07-14 06:05:58.432	0	2026-07-14 06:00:58.434
\.


--
-- Data for Name: ReapplyRequest; Type: TABLE DATA; Schema: public; Owner: bhu_user
--

COPY public."ReapplyRequest" (id, "applicationId", "applicantId", reason, "rollEmployeeId", "applicantName", status, "hodRemarks", "deanRemarks", "createdAt", "updatedAt") FROM stdin;
ff964b95-b752-4eac-9c7b-00b8b698fe92	7062a9c8-8929-4007-94a3-91e224f51e1f	d9d80baf-cf18-4c8b-b712-2268ea83e03a	Mistake in form, please allow reapply.	EMP1006	Dummy GA User 6	PENDING	\N	\N	2026-07-13 18:31:50.463	2026-07-13 18:31:50.463
ea6b4576-a367-4bc0-8858-fb792e27af7b	23811c42-15ef-469f-8ee3-6ade1acd761d	af1cd2e4-323f-458b-acd8-f7903f344607	Mistake in form, please allow reapply.	EMP1007	Dummy GA User 7	APPROVED	\N	\N	2026-07-13 18:31:50.479	2026-07-13 18:31:50.479
49f122ee-9abe-4543-b4ea-2e133db94121	38714c1c-08ae-4f34-8e9b-2dff342a8e25	a32fa40f-3002-49f7-8578-1ee7f8805ede	Mistake in form, please allow reapply.	EMP1006	Dummy TS User 6	PENDING	\N	\N	2026-07-13 18:31:50.594	2026-07-13 18:31:50.594
c561dba2-6477-4461-a35b-82dd68ec1426	686893bc-598c-4f21-954d-116caf6fe428	32a78175-f10f-4bf2-9cd8-2b2e4ee85dcc	Mistake in form, please allow reapply.	EMP1007	Dummy TS User 7	APPROVED	\N	\N	2026-07-13 18:31:50.611	2026-07-13 18:31:50.611
3669b230-ba7b-43f3-be64-b32d23b1ac51	f2426f1e-8f16-4185-9246-7a3b6fe88e47	a806e960-bef3-45f6-b0cc-e3200d4503b7	Mistake in form, please allow reapply.	EMP1006	Dummy NTS User 6	PENDING	\N	\N	2026-07-13 18:31:50.696	2026-07-13 18:31:50.696
0d8dc29c-493f-41c1-9cec-d34dd94ac195	ef6bd1ac-c278-4724-8adc-6b6dd10d4a78	a90dd76f-2bfa-4e8a-babf-1c159f0c22a3	Mistake in form, please allow reapply.	EMP1007	Dummy NTS User 7	APPROVED	\N	\N	2026-07-13 18:31:50.704	2026-07-13 18:31:50.704
1aabcda4-f6bf-4191-8e66-10d638eacabc	f1d1e232-aca1-4ccf-a984-2e18fa1804fc	0929b71a-7e28-417a-9d47-45bdf3316628	Mistake in form, please allow reapply.	EN1006	Dummy RS User 6	PENDING	\N	\N	2026-07-13 18:31:50.779	2026-07-13 18:31:50.779
2c079776-9163-4c58-b4d1-4033ef4b766c	a5267154-b472-477f-bee4-fbdd22660f73	3d68f995-6e9a-4aee-ad5e-d94c3c7eacc3	Mistake in form, please allow reapply.	EN1007	Dummy RS User 7	APPROVED	\N	\N	2026-07-13 18:31:50.789	2026-07-13 18:31:50.789
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: bhu_user
--

COPY public."User" (id, "alternateEmail", "bhuEmail", "passwordHash", "refreshToken", "firstName", "lastName", role, "requiresPasswordChange", "signatureStoragePath", "departmentId", "createdAt", "updatedAt", "roleExpiryDate", "retirementDate") FROM stdin;
58a847cd-dc99-4c90-af24-c4f5b18c7894	dummy_ga_0@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	GA User 0	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.344	2026-07-13 18:31:50.344	\N	\N
f80dfde2-8101-4c8a-a98e-7d5f296065d2	dummy_ga_1@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	GA User 1	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.382	2026-07-13 18:31:50.382	\N	\N
c8ca780a-5d82-4146-9c01-d5fc89acd8b9	dummy_ga_2@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	GA User 2	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.405	2026-07-13 18:31:50.405	\N	\N
c477bcf4-15dd-40b6-98e9-9d39d043b579	dummy_ga_3@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	GA User 3	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.419	2026-07-13 18:31:50.419	\N	\N
8a632ada-544c-4534-9a71-0aa146a52c66	dummy_ga_4@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	GA User 4	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.436	2026-07-13 18:31:50.436	\N	\N
cb91ee77-6aec-45f7-93da-ec632dbfd813	dummy_ga_5@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	GA User 5	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.445	2026-07-13 18:31:50.445	\N	\N
d9d80baf-cf18-4c8b-b712-2268ea83e03a	dummy_ga_6@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	GA User 6	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.455	2026-07-13 18:31:50.455	\N	\N
af1cd2e4-323f-458b-acd8-f7903f344607	dummy_ga_7@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	GA User 7	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.469	2026-07-13 18:31:50.469	\N	\N
ba2aa021-9686-4f38-8e93-85735178cb36	dummy_ga_8@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	GA User 8	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.485	2026-07-13 18:31:50.485	\N	\N
15b1ea06-28d2-4980-91d9-057e38ee2f75	dummy_ga_9@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	GA User 9	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.5	2026-07-13 18:31:50.5	\N	\N
abf9c259-a889-477e-a757-9547f13fadd2	dummy_ts_0@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	TS User 0	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.514	2026-07-13 18:31:50.514	\N	\N
df13ab39-9381-44fc-98bc-2899b9561ddd	dummy_ts_1@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	TS User 1	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.523	2026-07-13 18:31:50.523	\N	\N
db3826fb-2a50-42c1-ba95-04a29796ada0	dummy_ts_2@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	TS User 2	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.535	2026-07-13 18:31:50.535	\N	\N
43e619cd-7a1f-48f9-aad8-f35ee9618895	dummy_ts_3@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	TS User 3	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.543	2026-07-13 18:31:50.543	\N	\N
48fbf2c1-d85a-4226-8f48-3ee3b8db1985	dummy_ts_4@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	TS User 4	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.556	2026-07-13 18:31:50.556	\N	\N
cfb7a700-d71c-4f22-99b5-a5c03591a343	dummy_ts_5@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	TS User 5	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.566	2026-07-13 18:31:50.566	\N	\N
a32fa40f-3002-49f7-8578-1ee7f8805ede	dummy_ts_6@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	TS User 6	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.579	2026-07-13 18:31:50.579	\N	\N
32a78175-f10f-4bf2-9cd8-2b2e4ee85dcc	dummy_ts_7@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	TS User 7	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.596	2026-07-13 18:31:50.596	\N	\N
3de833fc-a1ab-43cd-be4c-a7786692f36a	dummy_ts_8@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	TS User 8	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.614	2026-07-13 18:31:50.614	\N	\N
463e9f41-ef68-4d2a-a731-fccbe436294c	dummy_ts_9@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	TS User 9	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.626	2026-07-13 18:31:50.626	\N	\N
b0e90227-2492-4c8d-a630-859ef04f8404	dummy_nts_0@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	NTS User 0	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.636	2026-07-13 18:31:50.636	\N	\N
18512ab6-f1b0-4767-9a1a-3c4da1dbd8d7	dummy_nts_1@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	NTS User 1	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.646	2026-07-13 18:31:50.646	\N	\N
46647a17-d905-4f92-85c2-75342a404e97	dummy_nts_2@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	NTS User 2	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.655	2026-07-13 18:31:50.655	\N	\N
284616bd-952a-4c43-97b3-18af8119c6a4	dummy_nts_3@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	NTS User 3	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.662	2026-07-13 18:31:50.662	\N	\N
77da8e71-b7f5-4c17-aba9-8a45f2e71609	dummy_nts_4@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	NTS User 4	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.671	2026-07-13 18:31:50.671	\N	\N
7b2e54f6-4898-430a-8820-2502bd10e783	dummy_nts_5@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	NTS User 5	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.678	2026-07-13 18:31:50.678	\N	\N
a806e960-bef3-45f6-b0cc-e3200d4503b7	dummy_nts_6@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	NTS User 6	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.688	2026-07-13 18:31:50.688	\N	\N
a90dd76f-2bfa-4e8a-babf-1c159f0c22a3	dummy_nts_7@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	NTS User 7	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.698	2026-07-13 18:31:50.698	\N	\N
fea5b3f1-cddc-4840-abb5-585a1c8f4465	dummy_nts_8@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	NTS User 8	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.707	2026-07-13 18:31:50.707	\N	\N
8f396945-a5f5-44eb-88a0-6dd34b6cc27c	student@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	$argon2id$v=19$m=65536,t=3,p=4$PSxm8ciSGnDnFlTS9YTmMg$YwHccs3F33Q67/DIgsJegWbHHrOlDow+J7p9sOjK0sc	Test	Student	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.314	2026-07-15 09:09:57.302	\N	\N
3356ca19-da1b-4181-ad5e-f0c92aaba6d0	dummy_nts_9@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	NTS User 9	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.716	2026-07-13 18:31:50.716	\N	\N
d60a9a11-4289-4669-8c20-38fec172764a	dummy_rs_0@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	RS User 0	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.724	2026-07-13 18:31:50.724	\N	\N
feeb6e2a-5d03-4131-82db-703219c6ab2a	dummy_rs_1@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	RS User 1	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.731	2026-07-13 18:31:50.731	\N	\N
f90158e7-4e31-4235-9ffc-8498417dfd54	dummy_rs_2@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	RS User 2	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.738	2026-07-13 18:31:50.738	\N	\N
b696ac04-c227-43c7-938b-864bcec347fe	dummy_rs_3@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	RS User 3	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.746	2026-07-13 18:31:50.746	\N	\N
e5ef4833-4e5e-4352-9352-740faa229c93	dummy_rs_4@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	RS User 4	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.755	2026-07-13 18:31:50.755	\N	\N
8ae8c9a7-8e38-48b2-b1dd-27d596e943cb	dummy_rs_5@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	RS User 5	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.764	2026-07-13 18:31:50.764	\N	\N
0929b71a-7e28-417a-9d47-45bdf3316628	dummy_rs_6@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	RS User 6	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.772	2026-07-13 18:31:50.772	\N	\N
3d68f995-6e9a-4aee-ad5e-d94c3c7eacc3	dummy_rs_7@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	RS User 7	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.78	2026-07-13 18:31:50.78	\N	\N
89963643-3cd7-4542-9a0a-226cd02acacd	dummy_rs_8@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	RS User 8	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.793	2026-07-13 18:31:50.793	\N	\N
74493e2e-7a8b-45a1-823a-d7ea9eeedf34	dummy_rs_9@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	Dummy	RS User 9	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.8	2026-07-13 18:31:50.8	\N	\N
64699791-3573-42df-91d5-6f6bd5d50096	dummy_dean_ug_0@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 0	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.815	2026-07-13 18:31:50.815	\N	\N
bae55ca5-8b12-43d3-8f14-92d7a86e509c	dummy_dean_ug_1@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 1	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.823	2026-07-13 18:31:50.823	\N	\N
9afd190e-8b10-4013-b99c-e34232ef836b	dummy_dean_ug_2@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 2	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.831	2026-07-13 18:31:50.831	\N	\N
eac9cdb1-4b64-47a9-a922-cef17442335d	dummy_dean_ug_3@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 3	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.843	2026-07-13 18:31:50.843	\N	\N
048b17c7-7c51-4539-bab4-5a76bb346472	dummy_dean_ug_4@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 4	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.852	2026-07-13 18:31:50.852	\N	\N
2b2816f7-3924-4275-9b25-184d72ec643f	dummy_dean_ug_5@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 5	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.863	2026-07-13 18:31:50.863	\N	\N
5fb7c345-2c87-489f-ac2c-086fb0dacf9d	dummy_dean_ug_6@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 6	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.872	2026-07-13 18:31:50.872	\N	\N
12b7d1f1-4fde-4a79-a02c-2d0409a89bf4	dummy_dean_ug_7@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 7	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.88	2026-07-13 18:31:50.88	\N	\N
99f9641d-ada2-408c-b0b4-f4a3225b6ae4	dummy_dean_ug_8@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 8	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.888	2026-07-13 18:31:50.888	\N	\N
7ba2a110-1ec1-48ca-aec9-170c7d0542be	dummy_dean_ug_9@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 9	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.896	2026-07-13 18:31:50.896	\N	\N
51dbd013-c6fc-4f13-b74b-2a33d4018fe9	dummy_dean_ug_10@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 10	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.903	2026-07-13 18:31:50.903	\N	\N
2b271aaa-27ca-444f-a3f4-3188f150d825	dummy_dean_ug_11@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 11	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.911	2026-07-13 18:31:50.911	\N	\N
1b34406b-4053-41a6-a904-936031ab7eed	dummy_dean_ug_12@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 12	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.918	2026-07-13 18:31:50.918	\N	\N
52865496-7ee0-4bfd-b98b-5b82c7a50d05	dummy_dean_ug_13@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 13	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.928	2026-07-13 18:31:50.928	\N	\N
70d44729-ee3e-4c3f-8e00-c374f8a7a88c	dummy_dean_ug_14@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 14	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.938	2026-07-13 18:31:50.938	\N	\N
4f8f561a-5eed-4f5d-9ff6-72d2c0c31850	dummy_dean_ug_15@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 15	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.946	2026-07-13 18:31:50.946	\N	\N
a2c4ccdb-79b2-40ee-87b5-1b3f0de93f5e	dummy_dean_ug_16@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 16	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.954	2026-07-13 18:31:50.954	\N	\N
8a37c105-f917-476a-b031-7532a6ad4b04	dummy_dean_ug_17@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 17	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.961	2026-07-13 18:31:50.961	\N	\N
92f42a82-c887-4ff5-96c6-8d7bf871536e	dummy_dean_ug_18@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 18	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.969	2026-07-13 18:31:50.969	\N	\N
63dbf85f-2941-47b1-9f01-945c557ad2b2	dummy_dean_ug_19@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 19	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.976	2026-07-13 18:31:50.976	\N	\N
ec8786a7-3532-4e13-ad57-6a42cd91c2be	dummy_dean_ug_20@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 20	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.985	2026-07-13 18:31:50.985	\N	\N
38024cb1-0663-4890-a47d-7fff5929d649	dummy_dean_ug_21@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 21	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:50.993	2026-07-13 18:31:50.993	\N	\N
f9f2150a-9a56-48ce-a24b-b9f633da2c74	dummy_dean_ug_22@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 22	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.001	2026-07-13 18:31:51.001	\N	\N
6c34a0f1-75a4-41aa-b9f3-52db39fc9748	dummy_dean_ug_23@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 23	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.009	2026-07-13 18:31:51.009	\N	\N
3a09db79-6ec3-4ef1-a244-2b45e0ee81b0	dummy_dean_ug_24@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 24	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.018	2026-07-13 18:31:51.018	\N	\N
ced34417-780f-4da2-91de-b8a2306ec0d6	dummy_dean_ug_25@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 25	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.029	2026-07-13 18:31:51.029	\N	\N
d5dbf537-5cca-49c0-b8e1-3933cae13909	dummy_dean_ug_26@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 26	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.037	2026-07-13 18:31:51.037	\N	\N
52642950-dcc8-4840-ba5a-4174a8e0c9a2	dummy_dean_ug_27@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 27	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.045	2026-07-13 18:31:51.045	\N	\N
02d8a2d6-cb40-4d8b-9ca8-046711f351b0	dummy_dean_ug_28@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 28	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.053	2026-07-13 18:31:51.053	\N	\N
d2d4c832-60e1-4854-836b-db6abe92df15	dummy_dean_ug_29@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 29	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.06	2026-07-13 18:31:51.06	\N	\N
6fe6f148-d068-4d7e-a47c-b8ef744784f9	dummy_dean_ug_30@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 30	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.067	2026-07-13 18:31:51.067	\N	\N
7fa05e92-4b4d-45b8-896c-520c82699723	dummy_dean_ug_31@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 31	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.075	2026-07-13 18:31:51.075	\N	\N
f1f0f74e-d781-461c-b9aa-1bb518966167	dummy_dean_ug_32@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 32	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.082	2026-07-13 18:31:51.082	\N	\N
5dcabe29-bc5d-4058-9c18-4d30923ed4f6	dummy_dean_ug_33@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 33	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.09	2026-07-13 18:31:51.09	\N	\N
79173bc3-020b-441e-8fc5-1f5d4f376f53	dummy_dean_ug_34@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 34	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.097	2026-07-13 18:31:51.097	\N	\N
97a45688-2595-4ef8-86d4-062f8004367e	dummy_dean_ug_35@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 35	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.104	2026-07-13 18:31:51.104	\N	\N
096c2184-4e6b-4402-936b-456066866a12	dummy_dean_ug_36@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 36	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.112	2026-07-13 18:31:51.112	\N	\N
4c1c661d-66ce-47fe-aaa5-eba4b5df5532	dummy_dean_ug_37@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 37	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.12	2026-07-13 18:31:51.12	\N	\N
92de2a6c-22cb-4aee-aef7-4c5754488183	dummy_dean_ug_38@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 38	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.128	2026-07-13 18:31:51.128	\N	\N
31862e03-661d-4de3-ba27-f15158060309	dummy_dean_ug_39@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	\N	DummyDean	UG User 39	APPLICANT	f	\N	dept-cs	2026-07-13 18:31:51.136	2026-07-13 18:31:51.136	\N	\N
5b7e9196-16e6-4f20-a4d0-a117f0f14e42	haridjjs@gmail.com	\N	$argon2id$v=19$m=65536,t=3,p=4$ufe+TcP/NW/rm9dKYAp+zQ$6+Y+YO1f6xV2TDYn2+QgD+IqKzzfJYBF8XOrPQSGcGU	$argon2id$v=19$m=65536,t=3,p=4$+9a0+swc0ZjttaR2ZgP/hA$gv3Dx472YTKUhTvxyJR9Jert1zZfUSCCiLXvk7SjlYU	RIDDHI	XYZ	APPLICANT	f	\N	dept-cs	2026-07-14 09:04:12.497	2026-07-15 09:20:02.194	\N	\N
806864d3-a49f-498f-880b-c74e8b5454da	admin@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	$argon2id$v=19$m=65536,t=3,p=4$yeJPPK1HifYXmfVyavuhZg$Bp9vg17oCWzeG/kw58l4ItPUn5r85ZS++g3EE8fDZrc	CC	Admin	CC_ADMIN	f	\N	\N	2026-07-13 18:31:50.319	2026-07-15 06:55:27.389	\N	\N
fa9d2f04-24d8-4d75-b0f8-4d79b57a6ee8	akhileshyadav840060@gmail.com	\N	$argon2id$v=19$m=65536,t=3,p=4$ims5eZnaZBLmnysUz3UWtw$94HclAr3sy3KwnxmeB4unAuJDsq6mSo5MJisfJfLIQM	$argon2id$v=19$m=65536,t=3,p=4$TKUs6LQlXZqzmQGL13dsjg$eOIvJh1vhibfJn1iD5ywV5oOftcAJFYUKW9vxbd5aXU	sonu 	sharma	APPLICANT	f	\N	dept-cs	2026-07-14 06:15:01.023	2026-07-14 07:16:35.405	\N	\N
7c561a6a-62ea-4047-9b80-d02df50ba2cf	riddhijaiswal2026@gmail.com	sonu.compsci.2026@bhu.ac.in	$argon2id$v=19$m=65536,t=3,p=4$Fo5ujgjnsA1puqMVVs3tgQ$CuS+BVF4FYygw4PGzeUazZgSq4B3PeIZsULrV40s7AI	$argon2id$v=19$m=65536,t=3,p=4$n8E+2FWzSfpohND1HEsWww$3zm7khSwWKbyxoBrp7FyrQvV2O1pwY3lRYkq1BLe4EM	sonu 	sharma	APPLICANT	f	\N	dept-cs	2026-07-14 07:23:36.738	2026-07-14 07:35:32	\N	\N
eeddb80d-9043-41f0-9ef7-630f34417d65	dean@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	$argon2id$v=19$m=65536,t=3,p=4$pD9EkOvk2oqZqWiGc+46PA$adqh8awwk4HWx/6JHRSjrAJ49ylM+Ws5HJfeSfFVYnU	Test	Dean	DEAN	f	uploads/signatures/sig-1784012067148-2b936d47.png	\N	2026-07-13 18:31:50.327	2026-07-15 06:55:04.56	\N	\N
ff38fe65-3f77-4a0b-884d-1682cbe592b9	hod@bhu.ac.in	\N	$argon2id$v=19$m=65536,t=3,p=4$/mYi5Dh5jXAMltEemsnYqg$Yoci5PS4//khrmCYspOZlKN7vZ1W3LEZKWBgEPJjes4	$argon2id$v=19$m=65536,t=3,p=4$8exEhJCjyR08cYomGq/RHw$77KpmR3Hz1foKwbB8kK/JWZFGptHWqYQydIu9UjGyo8	Test	HOD	HOD	f	uploads/signatures/sig-1784010440028-c77971bd.png	dept-cs	2026-07-13 18:31:50.266	2026-07-15 06:55:38.441	\N	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: bhu_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
9904885e-a4f5-4a3c-8551-5fa4809ea215	b9e53c7e144d006ad06440d1a6b8740968ac2cc965310d4e16a643e3f0283241	2026-07-13 18:15:31.897239+00	20260709110911_init_schema	\N	\N	2026-07-13 18:15:31.612373+00	1
55a5e045-4d25-4f22-bf24-05c45b154052	f7637a09009651f28055ed95ba79e902bca58926880aac2aa7f2153322baff31	2026-07-13 18:15:31.934728+00	20260713112610_audit_log_immutability	\N	\N	2026-07-13 18:15:31.899382+00	1
\.


--
-- Name: Application Application_pkey; Type: CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."Application"
    ADD CONSTRAINT "Application_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: DepartmentRequest DepartmentRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."DepartmentRequest"
    ADD CONSTRAINT "DepartmentRequest_pkey" PRIMARY KEY (id);


--
-- Name: Department Department_pkey; Type: CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_pkey" PRIMARY KEY (id);


--
-- Name: OtpVerification OtpVerification_pkey; Type: CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."OtpVerification"
    ADD CONSTRAINT "OtpVerification_pkey" PRIMARY KEY (id);


--
-- Name: ReapplyRequest ReapplyRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."ReapplyRequest"
    ADD CONSTRAINT "ReapplyRequest_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Application_applicantId_idx; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE INDEX "Application_applicantId_idx" ON public."Application" USING btree ("applicantId");


--
-- Name: Application_status_departmentId_idx; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE INDEX "Application_status_departmentId_idx" ON public."Application" USING btree (status, "departmentId");


--
-- Name: Application_trackingId_key; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE UNIQUE INDEX "Application_trackingId_key" ON public."Application" USING btree ("trackingId");


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_entityId_idx; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE INDEX "AuditLog_entityId_idx" ON public."AuditLog" USING btree ("entityId");


--
-- Name: AuditLog_performedBy_idx; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE INDEX "AuditLog_performedBy_idx" ON public."AuditLog" USING btree ("performedBy");


--
-- Name: DepartmentRequest_applicantId_idx; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE INDEX "DepartmentRequest_applicantId_idx" ON public."DepartmentRequest" USING btree ("applicantId");


--
-- Name: DepartmentRequest_status_idx; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE INDEX "DepartmentRequest_status_idx" ON public."DepartmentRequest" USING btree (status);


--
-- Name: Department_code_key; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE UNIQUE INDEX "Department_code_key" ON public."Department" USING btree (code);


--
-- Name: Department_hodId_key; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE UNIQUE INDEX "Department_hodId_key" ON public."Department" USING btree ("hodId");


--
-- Name: OtpVerification_email_idx; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE INDEX "OtpVerification_email_idx" ON public."OtpVerification" USING btree (email);


--
-- Name: OtpVerification_email_key; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE UNIQUE INDEX "OtpVerification_email_key" ON public."OtpVerification" USING btree (email);


--
-- Name: OtpVerification_expiresAt_idx; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE INDEX "OtpVerification_expiresAt_idx" ON public."OtpVerification" USING btree ("expiresAt");


--
-- Name: ReapplyRequest_applicantId_idx; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE INDEX "ReapplyRequest_applicantId_idx" ON public."ReapplyRequest" USING btree ("applicantId");


--
-- Name: ReapplyRequest_applicationId_idx; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE INDEX "ReapplyRequest_applicationId_idx" ON public."ReapplyRequest" USING btree ("applicationId");


--
-- Name: ReapplyRequest_status_idx; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE INDEX "ReapplyRequest_status_idx" ON public."ReapplyRequest" USING btree (status);


--
-- Name: User_alternateEmail_idx; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE INDEX "User_alternateEmail_idx" ON public."User" USING btree ("alternateEmail");


--
-- Name: User_alternateEmail_key; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE UNIQUE INDEX "User_alternateEmail_key" ON public."User" USING btree ("alternateEmail");


--
-- Name: User_bhuEmail_key; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE UNIQUE INDEX "User_bhuEmail_key" ON public."User" USING btree ("bhuEmail");


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: bhu_user
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: AuditLog trg_prevent_audit_update; Type: TRIGGER; Schema: public; Owner: bhu_user
--

CREATE TRIGGER trg_prevent_audit_update BEFORE DELETE OR UPDATE ON public."AuditLog" FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modifications();


--
-- Name: Application Application_applicantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."Application"
    ADD CONSTRAINT "Application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Application Application_deanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."Application"
    ADD CONSTRAINT "Application_deanId_fkey" FOREIGN KEY ("deanId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Application Application_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."Application"
    ADD CONSTRAINT "Application_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Application Application_hodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."Application"
    ADD CONSTRAINT "Application_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DepartmentRequest DepartmentRequest_applicantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."DepartmentRequest"
    ADD CONSTRAINT "DepartmentRequest_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReapplyRequest ReapplyRequest_applicantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."ReapplyRequest"
    ADD CONSTRAINT "ReapplyRequest_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReapplyRequest ReapplyRequest_applicationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."ReapplyRequest"
    ADD CONSTRAINT "ReapplyRequest_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES public."Application"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhu_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict NiNJ7G0MSmTXlPfkNma3l2b1oZRVl0JfGarOWdIx25yhEQzGtGFQtwC2ZW3Z0Cf

