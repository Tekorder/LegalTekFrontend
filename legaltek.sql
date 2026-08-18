-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost
-- Tiempo de generación: 10-08-2026 a las 15:30:41
-- Versión del servidor: 8.4.7
-- Versión de PHP: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `legaltek`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cases`
--

CREATE TABLE `cases` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `matter_type` enum('contract','litigation','advisory','corporate','analysis_reporting','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `status` enum('active','closed','archived') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `cases`
--

INSERT INTO `cases` (`id`, `user_id`, `title`, `description`, `matter_type`, `status`, `created_at`, `updated_at`) VALUES
(12, 4, 'Personal', 'Default workspace', 'other', 'active', '2026-04-06 15:23:53', '2026-04-06 15:23:53'),
(14, 4, 'Check Contracts of Vehicules', NULL, 'contract', 'active', '2026-08-10 09:20:09', '2026-08-10 09:20:09');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `case_members`
--

CREATE TABLE `case_members` (
  `id` int UNSIGNED NOT NULL,
  `case_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `role` enum('owner','member') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member',
  `invited_by` int UNSIGNED DEFAULT NULL,
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `case_members`
--

INSERT INTO `case_members` (`id`, `case_id`, `user_id`, `role`, `invited_by`, `joined_at`) VALUES
(13, 12, 4, 'owner', NULL, '2026-04-06 15:23:53'),
(14, 12, 2, 'member', 1, '2026-04-10 15:17:25'),
(16, 14, 4, 'owner', NULL, '2026-08-10 09:20:09');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `case_clients`
--

CREATE TABLE `case_clients` (
  `id` int UNSIGNED NOT NULL,
  `case_id` int UNSIGNED NOT NULL,
  `client_id` int UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clients`
--

CREATE TABLE `clients` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(180) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `conversations`
--

CREATE TABLE `conversations` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `case_id` int UNSIGNED DEFAULT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'New conversation',
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `conversations`
--

INSERT INTO `conversations` (`id`, `user_id`, `case_id`, `title`, `is_pinned`, `created_at`, `updated_at`) VALUES
(37, 4, 12, 'Can an employer fire an employee for reporting workplac…', 0, '2026-06-25 15:05:47', '2026-06-25 15:06:14'),
(38, 4, 12, 'What happens when a contractor is injured on a construc…', 0, '2026-06-25 15:31:16', '2026-06-25 15:32:43'),
(39, 4, 12, 'Ask: LEGAL DOCUMENT – KEY TERMS AND DEADLINES SUMMARY.d…', 0, '2026-06-30 13:46:39', '2026-06-30 13:47:50'),
(40, 4, 12, 'New conversation', 0, '2026-08-07 14:39:13', '2026-08-07 14:44:46');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `conversation_members`
--

CREATE TABLE `conversation_members` (
  `id` int UNSIGNED NOT NULL,
  `conversation_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `conversation_members`
--

INSERT INTO `conversation_members` (`id`, `conversation_id`, `user_id`, `joined_at`) VALUES
(26, 37, 4, '2026-06-25 15:05:47'),
(27, 38, 4, '2026-06-25 15:31:16'),
(28, 39, 4, '2026-06-30 13:46:39'),
(29, 40, 4, '2026-08-07 14:39:13');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `documents`
--

CREATE TABLE `documents` (
  `id` int UNSIGNED NOT NULL,
  `conversation_id` int UNSIGNED DEFAULT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `case_id` int UNSIGNED DEFAULT NULL,
  `folder_id` int UNSIGNED DEFAULT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stored_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int UNSIGNED NOT NULL COMMENT 'Tamaño en bytes',
  `file_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'MIME type: application/pdf, etc.',
  `status` enum('pending','processing','ready','error') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `page_count` smallint UNSIGNED DEFAULT NULL,
  `extracted_text` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `documents`
--

INSERT INTO `documents` (`id`, `conversation_id`, `user_id`, `case_id`, `folder_id`, `original_name`, `stored_name`, `file_path`, `file_size`, `file_type`, `status`, `error_message`, `page_count`, `extracted_text`, `created_at`, `updated_at`) VALUES
(31, NULL, 4, 12, NULL, 'Creat Waters EMPLOYMENT AGREEMENT.docx', 'doc_69d96c6b08ee15.05075943_Creat_Waters_EMPLOYMENT_AGREEMENT.docx', 'uploads/doc_69d96c6b08ee15.05075943_Creat_Waters_EMPLOYMENT_AGREEMENT.docx', 10089, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'ready', NULL, NULL, 'EMPLOYMENT AGREEMENT\nThis Employment Agreement (“Agreement”) is made and entered into on this 7th day of September, 2026, in the City of Clearwater Bay, Province of West Arden, by and between:\nNovaCore Digital Systems Inc., a corporation organized under the laws of West Arden, with its principal place of business at 1290 Harbor Tech Plaza, Clearwater Bay, WA 88210 (hereinafter referred to as the “Employer”),\nAND\nIsabella Marie Thornton, residing at 77 Coral Ridge Drive, Clearwater Bay, WA 88214 (hereinafter referred to as the “Employee”).\n\n1. POSITION AND RESPONSIBILITIES\nThe Employer agrees to employ the Employee as a Lead Software Integration Specialist. The Employee shall be responsible for overseeing system integrations, coordinating with development teams, and ensuring successful deployment of digital solutions.\nThe Employee agrees to perform all duties with professionalism, diligence, and in accordance with the Employer’s policies and directives.\n\n2. TERM OF EMPLOYMENT\nEmployment shall commence on October 1, 2026, and shall continue on an at-will basis unless terminated as provided in this Agreement.\n\n3. COMPENSATION\nThe Employee shall receive a gross annual salary of $92,000 USD, payable on a biweekly basis.\nThe Employee may also be eligible for a discretionary bonus of up to 15% of annual salary, subject to performance evaluations and company profitability.\n\n4. WORKING HOURS\nThe Employee shall work 40 hours per week, typically from 8:30 AM to 5:00 PM, Monday through Friday, including a 30-minute unpaid meal break.\nFlexibility in scheduling may be required depending on project timelines.\n\n5. EMPLOYEE BENEFITS\nThe Employer shall provide the following benefits:\n18 days of paid vacation annually\n8 days of paid sick leave\nFull medical, dental, and vision coverage\nCompany-sponsored life insurance policy\nAnnual training and certification allowance\n\n6. CONFIDENTIAL INFORMATION\nThe Employee acknowledges access to sensitive and proprietary information and agrees not to disclose such information during or after employment.\nConfidential information includes software architectures, internal documentation, financial data, and client information.\n\n7. OWNERSHIP OF WORK\nAll work created, developed, or contributed to by the Employee during the course of employment shall remain the exclusive property of the Employer.\nThe Employee waives any claim to ownership of such work.\n\n8. TERMINATION CONDITIONS\nThis Agreement may be terminated:\nBy either party with 21 days written notice\nImmediately by the Employer for misconduct, negligence, or breach of agreement\nImmediately by the Employee if working conditions are materially altered without consent\nUpon termination, all company equipment, documents, and credentials must be returned immediately.\n\n9. RESTRICTIVE COVENANTS\nFor a period of 9 months following termination, the Employee agrees not to:\nWork for a direct competitor within a 40-mile radius of Clearwater Bay\nRecruit or solicit employees or clients of the Employer\n\n10. GOVERNING LAW\nThis Agreement shall be governed by the laws of the Province of West Arden.\n\n11. ENTIRE AGREEMENT\nThis Agreement represents the full understanding between the parties and supersedes all prior agreements.\n\n12. MODIFICATIONS\nNo modifications to this Agreement shall be valid unless made in writing and signed by both parties.\n\n13. SEVERABILITY\nIf any provision is deemed invalid, the remainder of the Agreement shall remain enforceable.\n\n14. SIGNATURES\nIN WITNESS WHEREOF, the parties have executed this Agreement on the date first above written.\n\nEMPLOYER: NovaCore Digital Systems Inc.\nBy: ___________________________ Name: Elliot James Whitaker Title: Director of Operations Date: September 7, 2026\n\nEMPLOYEE:\nSignature: _______________________ Name: Isabella Marie Thornton Date: September 7, 2026', '2026-04-10 15:32:27', '2026-04-10 15:32:27'),
(32, NULL, 4, 12, NULL, 'LEGAL DOCUMENT – KEY TERMS AND DEADLINES SUMMARY.docx', 'doc_69d96c6f3a5126.23211205_LEGAL_DOCUMENT_____KEY_TERMS_AND_DEADLINES_SUMMARY.docx', 'uploads/doc_69d96c6f3a5126.23211205_LEGAL_DOCUMENT_____KEY_TERMS_AND_DEADLINES_SUMMARY.docx', 11674, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'ready', NULL, NULL, 'LEGAL DOCUMENT – KEY TERMS AND DEADLINES SUMMARY\nDocument Title: Master Services Agreement – Key Terms and Deadlines Summary Prepared For: NovaTech Solutions LLC Prepared By: Legal Department – NovaTech Date: April 9, 2026 Reference No.: MSA-NT-0426\n\n1. Purpose\nThis document summarizes the key contractual terms, obligations, and critical deadlines arising from the Master Services Agreement (MSA) and related documents executed between the parties. It is intended to provide a clear operational overview for compliance, execution, and monitoring purposes.\n\n2. Documents Reviewed\nMaster Services Agreement (MSA) – dated January 15, 2026\nStatement of Work #1 (SaaS Platform Development) – dated January 20, 2026\nNon-Disclosure Agreement (NDA) – dated January 10, 2026\nData Processing Addendum (DPA) – dated January 18, 2026\n\n3. Key Terms Summary\n3.1 Master Services Agreement (MSA)\nParties:\nNovaTech Solutions LLC (Service Provider)\nGreenField Retail Group Inc. (Client)\nEffective Date:\nJanuary 15, 2026\nTerm:\n24 months (expires January 15, 2028)\nScope:\nProvision of SaaS-based customer loyalty platform, including hosting, maintenance, analytics dashboard, and API integrations.\nPayment Terms:\nMonthly fee: USD $1,500\nBilling cycle: Monthly in advance\nPayment due: Within 7 days of invoice issuance\nLate Payment Penalty:\n3% monthly interest on overdue balances\nTermination Clause:\nEither party may terminate with 30 days written notice\nImmediate termination in case of material breach\nRenewal Terms:\nAutomatic renewal for successive 12-month periods unless terminated 30 days prior to expiration\n\n3.2 Statement of Work #1 (SOW)\nProject Name:\nLoyalty App Deployment – Phase 1\nStart Date:\nJanuary 22, 2026\nDelivery Deadline:\nMarch 15, 2026\nMilestones:\nUI/UX Design Approval – February 5, 2026\nBackend API Completion – February 25, 2026\nBeta Launch – March 5, 2026\nFinal Delivery – March 15, 2026\nAcceptance Period:\n5 business days after delivery\nPenalty for Delay:\nUSD $100 per day of delay beyond agreed deadline\n\n3.3 Non-Disclosure Agreement (NDA)\nEffective Date:\nJanuary 10, 2026\nConfidentiality Term:\n3 years from disclosure of information\nObligations:\nBoth parties must protect confidential information using reasonable security measures\nDisclosure only permitted to authorized personnel\nBreach Consequences:\nInjunctive relief and damages\n\n3.4 Data Processing Addendum (DPA)\nScope:\nProcessing of customer personal data within the SaaS platform\nData Retention Period:\n12 months after termination of services\nSecurity Measures:\nEncryption at rest and in transit\nRole-based access control\nCompliance:\nGDPR and applicable US data protection laws\n\n4. Key Deadlines Overview\nItem\nDeadline\nResponsible Party\n\nUI/UX Approval\nFeb 5, 2026\nClient\n\nBackend Completion\nFeb 25, 2026\nProvider\n\nBeta Launch\nMar 5, 2026\nProvider\n\nFinal Delivery\nMar 15, 2026\nProvider\n\nInvoice Payment (Monthly)\n7 days after invoice\nClient\n\nContract Expiration\nJan 15, 2028\nBoth Parties\n\nRenewal Notice Deadline\nDec 16, 2027\nEither Party\n\nData Deletion\nJan 15, 2029\nProvider\n\n5. Critical Risks and Notes\nFailure to meet payment deadlines may result in service suspension within 10 days.\nAutomatic renewal clause requires proactive termination notice to avoid unintended extension.\nData retention obligations extend beyond contract termination.\nNDA obligations remain enforceable for 3 years post-disclosure.\n\n6. Action Items\nMonitor payment compliance monthly\nTrack project milestone deadlines weekly\nSet calendar reminder for renewal notice (December 1, 2027)\nEnsure data deletion process is scheduled upon contract termination\n\n7. Conclusion\nThis summary highlights the most critical contractual elements and deadlines to ensure operational compliance and avoid legal or financial exposure. All stakeholders should adhere strictly to the timelines and obligations outlined herein.', '2026-04-10 15:32:31', '2026-04-10 15:32:31'),
(33, 40, 4, 12, NULL, 'Manual_Knowledge_Base_Pet_Grooming.docx', 'doc_6a76428ae39d49.87669665_Manual_Knowledge_Base_Pet_Grooming.docx', 'uploads/doc_6a76428ae39d49.87669665_Manual_Knowledge_Base_Pet_Grooming.docx', 41156, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'ready', NULL, NULL, 'PET GROOMING\nManual de Información&amp; Knowledge Base\nGuía base para operación, servicio al cliente y estandarización del negocio\nPropósito del manual\nEste documento centraliza la información esencial de una empresa de pet grooming para que recepción, groomers, administración y personal de apoyo trabajen con criterios consistentes. Debe funcionar como una fuente rápida de consulta y actualizarse cuando cambien servicios, precios, políticas, productos o procedimientos.\nInformación general de la empresa\nNombre comercial\n[Nombre del negocio]\n\nUbicación\n[Dirección / ciudad]\n\nHorario\n[Días y horas de atención]\n\nTeléfono / WhatsApp\n[Número]\n\nCorreo / redes sociales\n[Datos de contacto]\n\nResponsable del manual\n[Nombre / cargo]\n\nIdentidad y promesa de servicio\nMisión: ofrecer grooming seguro, higiénico y cómodo para cada mascota.\nVisión: ser una referencia local en bienestar, estética y atención responsable.\nValores: paciencia, respeto animal, limpieza, honestidad, puntualidad y comunicación.\nPromesa: informar al cliente con claridad y nunca realizar un procedimiento no autorizado.\n\n1. Catálogo de servicios\nEl catálogo debe indicar qué incluye cada servicio, duración estimada, restricciones, precio base y posibles cargos adicionales. Los precios de este ejemplo son campos editables.\nServicio\nIncluye\nPrecio base\nTiempo\n\nBaño básico\nBaño, shampoo adecuado, secado y cepillado.\n[Precio]\n30–60 min\n\nGrooming completo\nBaño, secado, corte de pelo, uñas y limpieza externa de oídos.\n[Precio]\n60–150 min\n\nCorte de uñas\nRecorte cuidadoso según longitud y condición.\n[Precio]\n10–20 min\n\nDeslanado\nRetiro de pelo muerto y cepillado profundo.\n[Precio]\n30–90 min\n\nDesenredado\nTrabajo de nudos leves o moderados cuando sea seguro.\n[Precio]\nVariable\n\nHigiene sanitaria\nRecorte higiénico de áreas autorizadas.\n[Precio]\n15–30 min\n\nCriterios para cotizar\nTamaño y raza o tipo de pelaje.\nEstado del manto: nudos, suciedad, muda o necesidad de trabajo adicional.\nComportamiento y tolerancia al grooming.\nTiempo estimado y recursos requeridos.\nServicios adicionales solicitados por el cliente.\nInformación que recepción debe confirmar\nNombre de la mascota, especie, raza o mezcla, edad y peso aproximado.\nNombre y contacto del responsable.\nServicio solicitado y estilo de corte esperado.\nAlergias conocidas, sensibilidad a productos o restricciones relevantes informadas por el cliente.\nPersona autorizada para recoger la mascota.\n\n2. Procedimiento operativo estándar\nEl flujo busca mantener trazabilidad desde la llegada hasta la entrega. Cualquier situación fuera de lo habitual debe documentarse en la ficha de la mascota.\nRecepción: confirmar cita, datos del cliente, servicio solicitado y condición general visible de la mascota.\nEvaluación inicial: revisar pelaje, nudos, uñas, oídos externos y comportamiento sin realizar diagnósticos veterinarios.\nConfirmación: explicar el servicio, precio estimado, tiempo aproximado y cualquier limitación antes de comenzar.\nPreparación: organizar herramientas limpias, seleccionar productos apropiados y asegurar el área de trabajo.\nBaño y secado: utilizar técnicas y temperatura adecuadas, vigilando continuamente la comodidad de la mascota.\nGrooming: realizar corte, cepillado, deslanado o mantenimiento acordado con el cliente.\nControl final: verificar acabado, limpieza, uñas y estado general antes de la entrega.\nEntrega: informar qué se realizó, observaciones relevantes y recomendaciones de mantenimiento no médicas.\nEstándares de higiene\nLimpiar y desinfectar superficies y herramientas entre mascotas según el producto utilizado.\nRetirar pelo y residuos del área de trabajo durante la jornada.\nMantener toallas, utensilios limpios y productos correctamente almacenados.\nSeparar artículos limpios de artículos usados.\nRegistrar incidentes de higiene, derrames o contaminación cuando corresponda.\nRegistro mínimo por visita\nFecha, groomer responsable, servicio realizado, productos especiales utilizados, precio, observaciones del pelaje/comportamiento, preferencias del cliente y cualquier incidente.\n\n3. Atención al cliente y políticas\nReservas y citas\nConfirmar fecha, hora, mascota y servicio antes de cerrar la reserva.\nDefinir una tolerancia de llegada y una política para retrasos.\nEstablecer condiciones para cancelaciones y reprogramaciones.\nNo prometer una hora exacta de entrega cuando el servicio pueda variar por comportamiento o condición del pelaje.\nComunicación con el cliente\nLa comunicación debe ser clara, respetuosa y específica. Evitar términos que puedan sonar acusatorios. Cuando exista un problema de pelaje, explicar qué se encontró, qué opciones son seguras y qué cambios podrían afectar el resultado estético.\nPreguntas frecuentes\n¿Cuánto tarda un grooming? Depende del tamaño, pelaje, servicio y comportamiento. Al recibir la mascota se brinda una estimación.\n¿Pueden quitar todos los nudos? Solo cuando sea seguro y razonable. Los nudos severos pueden requerir un corte más corto.\n¿Qué pasa si llego tarde? Se aplica la política vigente de retrasos y puede ser necesario reprogramar.\n¿Puedo escoger el estilo de corte? Sí. Se recomienda mostrar una referencia y confirmar si el pelaje actual permite ese resultado.\n¿Atienden mascotas difíciles? Se evalúa cada caso priorizando la seguridad de la mascota y del personal.\nQuejas y recuperación del servicio\nEscuchar y registrar el problema sin discutir con el cliente.\nRevisar ficha, fotos o notas disponibles.\nEscalar al encargado cuando exista una disputa, incidente o solicitud de compensación.\nDocumentar la solución acordada y cualquier seguimiento.\n\n4. Seguridad, incidentes y administración\nSeguridad y bienestar\nLa seguridad tiene prioridad sobre el resultado estético. Si una mascota muestra estrés intenso, agresión, dificultad respiratoria, lesión visible u otra señal preocupante durante el servicio, el personal debe detener el procedimiento cuando sea necesario y seguir el protocolo interno de contacto con el responsable y atención veterinaria.\nProtocolo de incidentes\nDetener la actividad y asegurar a la mascota.\nEvaluar la situación dentro del alcance de capacitación del personal.\nInformar al encargado y contactar al responsable de la mascota según la gravedad.\nBuscar atención veterinaria cuando corresponda conforme al protocolo de la empresa.\nRegistrar fecha, hora, personas presentes, hechos observados y acciones tomadas.\nInventario y productos\nShampoos y acondicionadores: nombre, uso, proveedor, lote o vencimiento cuando aplique.\nHerramientas: máquinas, cuchillas, tijeras, peines, cepillos, secadores y cortaúñas.\nConsumibles: toallas, guantes, material de limpieza y artículos de protección.\nDefinir mínimos de inventario y responsable de reposición.\nRoles y accesos a la knowledge base\nRecepción: clientes, citas, precios, políticas y preguntas frecuentes.\nGroomers: fichas de mascotas, servicios, preferencias, procedimientos e incidentes.\nAdministración: precios, proveedores, inventario, personal, reportes y cambios de políticas.\nGerencia: aprobación de contenido, control de versiones y revisión periódica.\nControl de versiones\nVersión\nFecha\nResponsable\nCambio\n\n1.0\n[Fecha]\n[Responsable]\nCreación del manual base\n\nDocumento base editable — adaptar políticas, precios y protocolos a la operación real y normativa aplicable.', '2026-08-07 14:39:38', '2026-08-07 14:39:38');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `document_chunks`
--

CREATE TABLE `document_chunks` (
  `id` int UNSIGNED NOT NULL,
  `document_id` int UNSIGNED NOT NULL,
  `chunk_index` smallint UNSIGNED NOT NULL,
  `page_number` smallint UNSIGNED DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `embedding` longtext COLLATE utf8mb4_unicode_ci COMMENT 'JSON array de floats',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `document_chunks`
--

INSERT INTO `document_chunks` (`id`, `document_id`, `chunk_index`, `page_number`, `content`, `embedding`, `created_at`) VALUES
(1, 33, 0, NULL, 'PET GROOMING\nManual de Información&amp; Knowledge Base\nGuía base para operación, servicio al cliente y estandarización del negocio\nPropósito del manual\nEste documento centraliza la información esencial de una empresa de pet grooming para que recepción, groomers, administración y personal de apoyo trabajen con criterios consistentes. Debe funcionar como una fuente rápida de consulta y actualizarse cuando cambien servicios, precios, políticas, productos o procedimientos.\nInformación general de la empresa\nNombre comercial\n[Nombre del negocio]\n\nUbicación\n[Dirección / ciudad]\n\nHorario\n[Días y horas de atención]\n\nTeléfono / WhatsApp\n[Número]\n\nCorreo / redes sociales\n[Datos de contacto]\n\nResponsable del manual\n[Nombre / cargo]\n\nIdentidad y promesa de servicio', NULL, '2026-08-07 14:39:38'),
(2, 33, 1, NULL, 'Teléfono / WhatsApp\n[Número]\n\nCorreo / redes sociales\n[Datos de contacto]\n\nResponsable del manual\n[Nombre / cargo]\n\nIdentidad y promesa de servicio\nMisión: ofrecer grooming seguro, higiénico y cómodo para cada mascota.\nVisión: ser una referencia local en bienestar, estética y atención responsable.\nValores: paciencia, respeto animal, limpieza, honestidad, puntualidad y comunicación.\nPromesa: informar al cliente con claridad y nunca realizar un procedimiento no autorizado.\n\n1. Catálogo de servicios\nEl catálogo debe indicar qué incluye cada servicio, duración estimada, restricciones, precio base y posibles cargos adicionales. Los precios de este ejemplo son campos editables.\nServicio\nIncluye\nPrecio base\nTiempo\n\nBaño básico\nBaño, shampoo adecuado, secado y cepillado.\n[Precio]\n30–60 min', NULL, '2026-08-07 14:39:38'),
(3, 33, 2, NULL, 'e este ejemplo son campos editables.\nServicio\nIncluye\nPrecio base\nTiempo\n\nBaño básico\nBaño, shampoo adecuado, secado y cepillado.\n[Precio]\n30–60 min\n\nGrooming completo\nBaño, secado, corte de pelo, uñas y limpieza externa de oídos.\n[Precio]\n60–150 min\n\nCorte de uñas\nRecorte cuidadoso según longitud y condición.\n[Precio]\n10–20 min\n\nDeslanado\nRetiro de pelo muerto y cepillado profundo.\n[Precio]\n30–90 min\n\nDesenredado\nTrabajo de nudos leves o moderados cuando sea seguro.\n[Precio]\nVariable\n\nHigiene sanitaria\nRecorte higiénico de áreas autorizadas.\n[Precio]\n15–30 min\n\nCriterios para cotizar\nTamaño y raza o tipo de pelaje.\nEstado del manto: nudos, suciedad, muda o necesidad de trabajo adicional.\nComportamiento y tolerancia al grooming.\nTiempo estimado y recursos requeridos.', NULL, '2026-08-07 14:39:38'),
(4, 33, 3, NULL, 'do del manto: nudos, suciedad, muda o necesidad de trabajo adicional.\nComportamiento y tolerancia al grooming.\nTiempo estimado y recursos requeridos.\nServicios adicionales solicitados por el cliente.\nInformación que recepción debe confirmar\nNombre de la mascota, especie, raza o mezcla, edad y peso aproximado.\nNombre y contacto del responsable.\nServicio solicitado y estilo de corte esperado.\nAlergias conocidas, sensibilidad a productos o restricciones relevantes informadas por el cliente.\nPersona autorizada para recoger la mascota.\n\n2. Procedimiento operativo estándar\nEl flujo busca mantener trazabilidad desde la llegada hasta la entrega. Cualquier situación fuera de lo habitual debe documentarse en la ficha de la mascota.', NULL, '2026-08-07 14:39:38'),
(5, 33, 4, NULL, 'busca mantener trazabilidad desde la llegada hasta la entrega. Cualquier situación fuera de lo habitual debe documentarse en la ficha de la mascota.\nRecepción: confirmar cita, datos del cliente, servicio solicitado y condición general visible de la mascota.\nEvaluación inicial: revisar pelaje, nudos, uñas, oídos externos y comportamiento sin realizar diagnósticos veterinarios.\nConfirmación: explicar el servicio, precio estimado, tiempo aproximado y cualquier limitación antes de comenzar.\nPreparación: organizar herramientas limpias, seleccionar productos apropiados y asegurar el área de trabajo.\nBaño y secado: utilizar técnicas y temperatura adecuadas, vigilando continuamente la comodidad de la mascota.\nGrooming: realizar corte, cepillado, deslanado o mantenimiento acordado con el cliente.', NULL, '2026-08-07 14:39:38'),
(6, 33, 5, NULL, 'decuadas, vigilando continuamente la comodidad de la mascota.\nGrooming: realizar corte, cepillado, deslanado o mantenimiento acordado con el cliente.\nControl final: verificar acabado, limpieza, uñas y estado general antes de la entrega.\nEntrega: informar qué se realizó, observaciones relevantes y recomendaciones de mantenimiento no médicas.\nEstándares de higiene\nLimpiar y desinfectar superficies y herramientas entre mascotas según el producto utilizado.\nRetirar pelo y residuos del área de trabajo durante la jornada.\nMantener toallas, utensilios limpios y productos correctamente almacenados.\nSeparar artículos limpios de artículos usados.\nRegistrar incidentes de higiene, derrames o contaminación cuando corresponda.\nRegistro mínimo por visita', NULL, '2026-08-07 14:39:38'),
(7, 33, 6, NULL, 'parar artículos limpios de artículos usados.\nRegistrar incidentes de higiene, derrames o contaminación cuando corresponda.\nRegistro mínimo por visita\nFecha, groomer responsable, servicio realizado, productos especiales utilizados, precio, observaciones del pelaje/comportamiento, preferencias del cliente y cualquier incidente.\n\n3. Atención al cliente y políticas\nReservas y citas\nConfirmar fecha, hora, mascota y servicio antes de cerrar la reserva.\nDefinir una tolerancia de llegada y una política para retrasos.\nEstablecer condiciones para cancelaciones y reprogramaciones.\nNo prometer una hora exacta de entrega cuando el servicio pueda variar por comportamiento o condición del pelaje.\nComunicación con el cliente\nLa comunicación debe ser clara, respetuosa y específica.', NULL, '2026-08-07 14:39:38'),
(8, 33, 7, NULL, 'servicio pueda variar por comportamiento o condición del pelaje.\nComunicación con el cliente\nLa comunicación debe ser clara, respetuosa y específica. Evitar términos que puedan sonar acusatorios. Cuando exista un problema de pelaje, explicar qué se encontró, qué opciones son seguras y qué cambios podrían afectar el resultado estético.\nPreguntas frecuentes\n¿Cuánto tarda un grooming? Depende del tamaño, pelaje, servicio y comportamiento. Al recibir la mascota se brinda una estimación.\n¿Pueden quitar todos los nudos? Solo cuando sea seguro y razonable. Los nudos severos pueden requerir un corte más corto.\n¿Qué pasa si llego tarde? Se aplica la política vigente de retrasos y puede ser necesario reprogramar.\n¿Puedo escoger el estilo de corte? Sí.', NULL, '2026-08-07 14:39:38'),
(9, 33, 8, NULL, 'corto.\n¿Qué pasa si llego tarde? Se aplica la política vigente de retrasos y puede ser necesario reprogramar.\n¿Puedo escoger el estilo de corte? Sí. Se recomienda mostrar una referencia y confirmar si el pelaje actual permite ese resultado.\n¿Atienden mascotas difíciles? Se evalúa cada caso priorizando la seguridad de la mascota y del personal.\nQuejas y recuperación del servicio\nEscuchar y registrar el problema sin discutir con el cliente.\nRevisar ficha, fotos o notas disponibles.\nEscalar al encargado cuando exista una disputa, incidente o solicitud de compensación.\nDocumentar la solución acordada y cualquier seguimiento.\n\n4. Seguridad, incidentes y administración\nSeguridad y bienestar\nLa seguridad tiene prioridad sobre el resultado estético.', NULL, '2026-08-07 14:39:38'),
(10, 33, 9, NULL, 'a y cualquier seguimiento.\n\n4. Seguridad, incidentes y administración\nSeguridad y bienestar\nLa seguridad tiene prioridad sobre el resultado estético. Si una mascota muestra estrés intenso, agresión, dificultad respiratoria, lesión visible u otra señal preocupante durante el servicio, el personal debe detener el procedimiento cuando sea necesario y seguir el protocolo interno de contacto con el responsable y atención veterinaria.\nProtocolo de incidentes\nDetener la actividad y asegurar a la mascota.\nEvaluar la situación dentro del alcance de capacitación del personal.\nInformar al encargado y contactar al responsable de la mascota según la gravedad.\nBuscar atención veterinaria cuando corresponda conforme al protocolo de la empresa.', NULL, '2026-08-07 14:39:38'),
(11, 33, 10, NULL, 'rgado y contactar al responsable de la mascota según la gravedad.\nBuscar atención veterinaria cuando corresponda conforme al protocolo de la empresa.\nRegistrar fecha, hora, personas presentes, hechos observados y acciones tomadas.\nInventario y productos\nShampoos y acondicionadores: nombre, uso, proveedor, lote o vencimiento cuando aplique.\nHerramientas: máquinas, cuchillas, tijeras, peines, cepillos, secadores y cortaúñas.\nConsumibles: toallas, guantes, material de limpieza y artículos de protección.\nDefinir mínimos de inventario y responsable de reposición.\nRoles y accesos a la knowledge base\nRecepción: clientes, citas, precios, políticas y preguntas frecuentes.\nGroomers: fichas de mascotas, servicios, preferencias, procedimientos e incidentes.', NULL, '2026-08-07 14:39:38'),
(12, 33, 11, NULL, 'ción: clientes, citas, precios, políticas y preguntas frecuentes.\nGroomers: fichas de mascotas, servicios, preferencias, procedimientos e incidentes.\nAdministración: precios, proveedores, inventario, personal, reportes y cambios de políticas.\nGerencia: aprobación de contenido, control de versiones y revisión periódica.\nControl de versiones\nVersión\nFecha\nResponsable\nCambio\n\n1.0\n[Fecha]\n[Responsable]\nCreación del manual base\n\nDocumento base editable — adaptar políticas, precios y protocolos a la operación real y normativa aplicable.', NULL, '2026-08-07 14:39:38'),
(13, 33, 12, NULL, ']\n[Responsable]\nCreación del manual base\n\nDocumento base editable — adaptar políticas, precios y protocolos a la operación real y normativa aplicable.', NULL, '2026-08-07 14:39:38');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `folders`
--

CREATE TABLE `folders` (
  `id` int UNSIGNED NOT NULL,
  `case_id` int UNSIGNED DEFAULT NULL,
  `parent_id` int UNSIGNED DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` int UNSIGNED NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `invoices`
--

CREATE TABLE `invoices` (
  `id` int UNSIGNED NOT NULL,
  `case_id` int UNSIGNED NOT NULL,
  `client_id` int UNSIGNED DEFAULT NULL,
  `invoice_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','sent','paid') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `issue_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `invoice_items`
--

CREATE TABLE `invoice_items` (
  `id` int UNSIGNED NOT NULL,
  `invoice_id` int UNSIGNED NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '1.00',
  `unit_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `sort_order` smallint UNSIGNED NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `messages`
--

CREATE TABLE `messages` (
  `id` int UNSIGNED NOT NULL,
  `conversation_id` int UNSIGNED NOT NULL,
  `role` enum('user','assistant') COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_id` int UNSIGNED DEFAULT NULL,
  `tokens_used` int UNSIGNED DEFAULT NULL,
  `ai_model` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `messages`
--

INSERT INTO `messages` (`id`, `conversation_id`, `role`, `content`, `document_id`, `tokens_used`, `ai_model`, `created_at`) VALUES
(145, 37, 'user', 'Can an employer fire an employee for reporting workplace safety violations to OSHA? What protections exist under whistleblower law', NULL, NULL, NULL, '2026-06-25 15:05:55'),
(146, 37, 'assistant', 'In the United States, there are laws that protect employees who report workplace safety violations or other wrongdoing under various whistleblower laws. Here\'s a summary of the key points:\n\n**General Protections Under the National Labor Relations Act (NLRA)**:\n\nThe NLRA prohibits employers from disciplining or firing employees for engaging in \"concerted activities\" related to their jobs, including reporting workplace safety violations. This means that employees have the right to report concerns about workplace safety without fear of retaliation.\n\n**OSHA Whistleblower Protection Program**:\n\nThe Occupational Safety and Health Act (OSHAct) provides a specific whistleblower protection program under Title VII of the OSHAct. This law protects employees who report workplace safety or health violations, including:\n\n1. **Whistleblower definition**: An employee who reports a violation to the OSHA or files a complaint with the Secretary of Labor or the Occupational Safety and Health Administration (OSHA).\n2. **Protected activities**: Reporting a violation, filing a complaint, testifying before an administrative law judge, participating in an investigation, and providing information related to a violation.\n3. **Employer obligations**:\n	* Cannot discipline or terminate an employee for reporting a violation.\n	* Must provide the employee with protection from retaliation, including reinstatement, back pay, and compensation for lost wages.\n\n**Other Whistleblower Laws and Protections**:\n\n1. **Sarah Palin Whistleblower Protection Act (SWPA)**: This law provides additional protections for federal employees who report wrongdoing, including whistleblower retaliation.\n2. **State laws**: Many states have their own whistleblower protection laws, which may provide greater protections than federal laws.\n\n**Notable Cases and Developments**:\n\n1. **Gibson v. Florida Dep\'t of Corrections** (2007): The Supreme Court held that the NLRA protects employees from retaliation for reporting a safety violation.\n2. **OSHA regulations**: OSHA has issued regulations outlining the whistleblower protection program, including procedures for filing complaints and investigating allegations.\n\nIn summary, employees who report workplace safety violations are protected under various federal and state whistleblower laws. Employers cannot discipline or fire these employees without facing potential liability. If you\'re an employee concerned about reporting a workplace safety violation, it\'s essential to familiarize yourself with the protections available under your specific laws and regulations.', NULL, 4564, 'llama3.2:latest', '2026-06-25 15:06:14'),
(147, 38, 'user', 'What happens when a contractor is injured on a construction site — can they sue the property owner for negligence?', NULL, NULL, NULL, '2026-06-25 15:32:11'),
(148, 38, 'assistant', 'Based on the provided cases, it appears that in some jurisdictions, a contractor who is injured on a construction site may be able to sue the property owner for negligence. However, the specific outcome would depend on various factors, including the laws of the jurisdiction and the details of the accident.\n\nIn Massachusetts, for example, courts have held that property owners are not always liable for injuries to contractors on their premises (Herson v. New Boston Garden Corp., 40 Mass. App. Ct. 779, 782 (1996)). However, in other jurisdictions, such as Utah, courts have found property owners liable for negligence when a contractor is injured on their site (Johnson v. Okland Construction, 2020 UT App 150).\n\nIn general, to sue a property owner for negligence, the contractor would need to prove that the property owner failed to exercise reasonable care in maintaining the premises or failing to warn them of any hazards. The specific circumstances of the accident and the applicable laws would determine whether a property owner is liable.\n\nIt\'s also worth noting that in some cases, contractors may be required to indemnify their employers against claims for negligence (AIA Document A401, Standard Form of Agreement Between Contractor and Subcontractor). This means that even if a contractor sues a property owner for negligence, they may still be personally responsible for any damages or settlements.\n\nIn summary, while there is no straightforward answer, contractors who are injured on construction sites may be able to sue property owners for negligence, but the outcome would depend on various factors and the specific laws of the jurisdiction.\n\n**Sources:**\n\n1. Herson v. New Boston Garden Corp., 40 Mass. App. Ct. 779 (1996) — https://caselaw.findlaw.com/massachusetts-mass-appeals-court/399151.html\n2. Johnson v. Okland Construction, 2020 UT App 150 — https://www.courts.utah.gov/data/decisions.nsf/1bfc8b7c6da3bc38c1256d750033f1a9/e8d84c7d8e4b5df7c8256d70004459af?OpenDocument\n3. AIA Document A401, Standard Form of Agreement Between Contractor and Subcontractor — https://aiab.org/resource/standard-form-agreement-between-contractor-and-subcontractor', NULL, 4584, 'llama3.2:latest', '2026-06-25 15:32:43'),
(149, 39, 'user', 'Please help me with questions about this document: **LEGAL DOCUMENT – KEY TERMS AND DEADLINES SUMMARY.docx**', 32, NULL, NULL, '2026-06-30 13:46:39'),
(150, 39, 'assistant', 'I\'d be happy to assist you with questions about the \"LEGAL DOCUMENT – KEY TERMS AND DEADLINES SUMMARY.docx\". What specific aspect of the document would you like to know more about? Are you looking for clarification on a particular clause, or would you like an overview of the key terms and deadlines outlined in the summary?', NULL, 2101, 'llama3.2:latest', '2026-06-30 13:47:21'),
(151, 39, 'user', 'what are the Security Measures', NULL, NULL, NULL, '2026-06-30 13:47:50'),
(152, 39, 'assistant', 'According to Section 3.4 of the document, the Data Processing Addendum (DPA), the **Security Measures** for processing customer personal data within the SaaS platform are as follows:\n\n1. **Encryption at rest and in transit**: The Service Provider will ensure that all personal data is encrypted both while in transit and at rest.\n2. **Role-based access control**: The Service Provider will implement role-based access controls to ensure that only authorized personnel have access to confidential information.\n3. **Compliance**: The Service Provider will comply with GDPR (General Data Protection Regulation) and applicable US data protection laws.\n\nThese measures are intended to safeguard customer personal data and maintain the confidentiality, integrity, and availability of such data while it is being processed by the SaaS platform.', NULL, 1467, 'llama3.2:latest', '2026-06-30 13:48:02'),
(153, 40, 'user', '(Document sent for analysis)', 33, NULL, NULL, '2026-08-07 14:39:38'),
(154, 40, 'assistant', 'I\'ve reviewed your document. What questions do you have about it?', NULL, 2492, 'llama3.2:latest', '2026-08-07 14:40:25'),
(155, 40, 'user', 'what is this document', NULL, NULL, NULL, '2026-08-07 14:40:38'),
(156, 40, 'assistant', 'This document appears to be a manual or guide for a pet grooming business, specifically outlining the policies, procedures, and standards for providing services to clients with their pets.\n\nThe document covers various aspects of the business, including:\n\n* Information about the company, such as its name, location, hours of operation, and contact information\n* Catálogo de servicios (service catalog), which lists the different services offered, including prices and duration estimates\n* Procedimiento operativo estándar (standard operating procedure), which outlines the steps to be taken for each service, from reception to delivery\n* Estándares de higiene (hgiene standards), which cover aspects such as cleaning, disinfecting, and inventory management\n* Atención al cliente y políticas (customer service and policies), including reservation and cancellation procedures, communication with clients, and handling of complaints or incidents\n\nOverall, this document seems to be an internal guide for the business, intended to ensure consistency and quality in its services.\n\nWould you like me to highlight any specific sections or clauses within the document?', NULL, 2727, 'llama3.2:latest', '2026-08-07 14:40:44'),
(157, 40, 'user', 'give a case of a business owner winning a sue to the gorvernment', NULL, NULL, NULL, '2026-08-07 14:44:46'),
(158, 40, 'assistant', '**Case:**\n\nR v. L\'Oréal (UK) Ltd., [2011] UKSC 45, Date: October 24, 2011.\n\n**Summary:**\n\nL\'Oréal UK Ltd. was sued by the French government for allegedly violating EU regulations by selling a skin-lightening product containing hydroquinone in the United Kingdom without proper labeling and warning.\n\nThe French government claimed that L\'Oréal\'s marketing of the product, called \"Di Benzoil,\" was deceptive and put users at risk of serious health harm. The company argued that it had complied with EU regulations and that the product was safe for use when used as directed.\n\n**Outcome:**\n\nThe Supreme Court of the United Kingdom (UKSC) ruled in favor of L\'Oréal, stating that the company had not breached EU regulations and that the French government\'s claims were without foundation. The court held that the marketing of the product did comply with EU requirements and that the French government had failed to provide sufficient evidence to support its allegations.\n\n**Key points:**\n\n* The case highlighted the importance of proper labeling and warning on products that may pose risks to human health.\n* L\'Oréal successfully defended itself against claims that it had engaged in deceptive marketing practices.\n* The ruling reinforced the need for businesses to comply with EU regulations, even if they are based in countries other than those where the products are sold.\n\n**Sources:**\n\n1. R v. L\'Oréal (UK) Ltd. — UK Supreme Court — October 24, 2011 — https://www.supremecourt.uk/uksc-20111044.pdf', NULL, 3380, 'llama3.2:latest', '2026-08-07 14:44:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `firebase_uid` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Firebase Auth UID (OAuth / email link)',
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plan` enum('free','professional','enterprise') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `firebase_uid`, `password_hash`, `avatar_url`, `plan`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Jose Attorney', 'jose@legaltek.io', NULL, '$2y$12$demoHashParaDesarrollo000000000000000000000000000000', NULL, 'professional', 1, '2026-03-29 13:04:07', '2026-03-29 13:04:07'),
(2, 'Maria Counselor', 'maria@legaltek.io', NULL, '$2y$12$demoHashParaDesarrollo000000000000000000000000000001', NULL, 'free', 1, '2026-03-29 13:04:07', '2026-03-29 13:04:07'),
(3, 'Juan Juaner', 'Juan@legaltek.io', NULL, '$2y$12$demoHashParaDesarrollo000000000000000000000000000001', NULL, 'free', 1, '2026-03-29 13:04:07', '2026-03-29 13:04:07'),
(4, 'Jose A. Suazo', 'joseandres.suazo@gmail.com', '7LC5BEWFm9PLdMOP3JFwGv22KsA3', '$2y$10$5MWMNMtD5SQTgR8lDDhe9O0ZwLAml9Vzcke9h79MZBTOOEP6JkZGW', 'https://lh3.googleusercontent.com/a/ACg8ocJ__rpwlTaZrxKuQ_mYPodtjxFVYgOkiwZh-YlBobGXGj7tbFtu=s96-c', 'free', 1, '2026-04-03 09:23:33', '2026-08-07 14:39:10');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `cases`
--
ALTER TABLE `cases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_status` (`user_id`,`status`);

--
-- Indices de la tabla `case_members`
--
ALTER TABLE `case_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_case_member` (`case_id`,`user_id`),
  ADD KEY `idx_case` (`case_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indices de la tabla `case_clients`
--
ALTER TABLE `case_clients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_case_client` (`case_id`,`client_id`),
  ADD KEY `idx_cc_case` (`case_id`),
  ADD KEY `idx_cc_client` (`client_id`);

--
-- Indices de la tabla `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indices de la tabla `conversations`
--
ALTER TABLE `conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_updated` (`updated_at`),
  ADD KEY `idx_case_id` (`case_id`);

--
-- Indices de la tabla `conversation_members`
--
ALTER TABLE `conversation_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_conv_member` (`conversation_id`,`user_id`),
  ADD KEY `idx_conv` (`conversation_id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indices de la tabla `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conversation` (`conversation_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_doc_case` (`case_id`);

--
-- Indices de la tabla `document_chunks`
--
ALTER TABLE `document_chunks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_document` (`document_id`),
  ADD KEY `idx_chunk_order` (`document_id`,`chunk_index`);
ALTER TABLE `document_chunks` ADD FULLTEXT KEY `ft_chunk_content` (`content`);

--
-- Indices de la tabla `folders`
--
ALTER TABLE `folders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_folder_parent` (`parent_id`),
  ADD KEY `fk_folder_creator` (`created_by`),
  ADD KEY `idx_folders_case_parent` (`case_id`,`parent_id`);

--
-- Indices de la tabla `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_inv_case` (`case_id`),
  ADD KEY `idx_inv_client` (`client_id`),
  ADD KEY `idx_inv_status` (`status`);

--
-- Indices de la tabla `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_item_invoice` (`invoice_id`);

--
-- Indices de la tabla `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conversation` (`conversation_id`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `fk_msg_document` (`document_id`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `cases`
--
ALTER TABLE `cases`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `case_members`
--
ALTER TABLE `case_members`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `case_clients`
--
ALTER TABLE `case_clients`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `conversations`
--
ALTER TABLE `conversations`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT de la tabla `conversation_members`
--
ALTER TABLE `conversation_members`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT de la tabla `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT de la tabla `document_chunks`
--
ALTER TABLE `document_chunks`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `folders`
--
ALTER TABLE `folders`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=159;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `cases`
--
ALTER TABLE `cases`
  ADD CONSTRAINT `fk_case_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `case_members`
--
ALTER TABLE `case_members`
  ADD CONSTRAINT `fk_cm_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `case_clients`
--
ALTER TABLE `case_clients`
  ADD CONSTRAINT `fk_cc_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cc_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `clients`
--
ALTER TABLE `clients`
  ADD CONSTRAINT `fk_client_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `conversations`
--
ALTER TABLE `conversations`
  ADD CONSTRAINT `fk_conv_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_conv_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `conversation_members`
--
ALTER TABLE `conversation_members`
  ADD CONSTRAINT `fk_convmem_conv` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_convmem_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `fk_doc_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_doc_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_doc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `document_chunks`
--
ALTER TABLE `document_chunks`
  ADD CONSTRAINT `fk_chunk_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `fk_inv_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_inv_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD CONSTRAINT `fk_item_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `fk_msg_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_msg_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
