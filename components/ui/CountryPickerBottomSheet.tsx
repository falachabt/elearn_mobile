import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  useColorScheme,
  Keyboard,
  Dimensions,
} from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

export type Country = {
  name: string;
  flag: string;
  code: string;
  placeholder: string;
  regex: RegExp;
  maxLength: number;
};

export const COUNTRIES: Country[] = [
  // Afrique (priorité)
  { name: 'Cameroun',              flag: '🇨🇲', code: '+237', placeholder: '6XX XX XX XX',   regex: /^6[4-9][0-9]{7}$/,  maxLength: 9  },
  { name: 'Algérie',               flag: '🇩🇿', code: '+213', placeholder: '5XX XX XX XX',   regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Angola',                flag: '🇦🇴', code: '+244', placeholder: '9XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Bénin',                 flag: '🇧🇯', code: '+229', placeholder: '9X XX XX XX',    regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Botswana',              flag: '🇧🇼', code: '+267', placeholder: '7X XXX XXX',     regex: /^\d{7,8}$/,          maxLength: 8  },
  { name: 'Burkina Faso',          flag: '🇧🇫', code: '+226', placeholder: '7X XX XX XX',    regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Burundi',               flag: '🇧🇮', code: '+257', placeholder: '7X XX XX XX',    regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Cabo Verde',            flag: '🇨🇻', code: '+238', placeholder: '9XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Centrafrique',          flag: '🇨🇫', code: '+236', placeholder: '7X XX XX XX',    regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Comores',               flag: '🇰🇲', code: '+269', placeholder: '3XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Congo (Brazzaville)',   flag: '🇨🇬', code: '+242', placeholder: '06 XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Congo (RDC)',           flag: '🇨🇩', code: '+243', placeholder: '8X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: "Côte d'Ivoire",         flag: '🇨🇮', code: '+225', placeholder: 'XX XX XX XX XX', regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Djibouti',              flag: '🇩🇯', code: '+253', placeholder: '77 XX XX XX',    regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Égypte',                flag: '🇪🇬', code: '+20',  placeholder: '1XX XXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Érythrée',              flag: '🇪🇷', code: '+291', placeholder: '7XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Éthiopie',              flag: '🇪🇹', code: '+251', placeholder: '9X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Eswatini',              flag: '🇸🇿', code: '+268', placeholder: '7X XX XXXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Gabon',                 flag: '🇬🇦', code: '+241', placeholder: '07 XX XX XX',    regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Gambie',                flag: '🇬🇲', code: '+220', placeholder: '7XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Ghana',                 flag: '🇬🇭', code: '+233', placeholder: '2X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Guinée',                flag: '🇬🇳', code: '+224', placeholder: '6XX XX XX XX',   regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Guinée-Bissau',         flag: '🇬🇼', code: '+245', placeholder: '9XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Guinée Équatoriale',    flag: '🇬🇶', code: '+240', placeholder: '2XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Kenya',                 flag: '🇰🇪', code: '+254', placeholder: '7XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Lesotho',               flag: '🇱🇸', code: '+266', placeholder: '5X XX XXXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Libéria',               flag: '🇱🇷', code: '+231', placeholder: '77 XXX XXXX',    regex: /^\d{8,9}$/,          maxLength: 9  },
  { name: 'Libye',                 flag: '🇱🇾', code: '+218', placeholder: '9X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Madagascar',            flag: '🇲🇬', code: '+261', placeholder: '3X XX XXX XX',   regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Malawi',                flag: '🇲🇼', code: '+265', placeholder: '9XX XX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Mali',                  flag: '🇲🇱', code: '+223', placeholder: '7X XX XX XX',    regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Maroc',                 flag: '🇲🇦', code: '+212', placeholder: '6XX XX XX XX',   regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Maurice',               flag: '🇲🇺', code: '+230', placeholder: '5XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Mauritanie',            flag: '🇲🇷', code: '+222', placeholder: '2X XX XX XX',    regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Mozambique',            flag: '🇲🇿', code: '+258', placeholder: '8X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Namibie',               flag: '🇳🇦', code: '+264', placeholder: '8X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Niger',                 flag: '🇳🇪', code: '+227', placeholder: '9X XX XX XX',    regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Nigéria',               flag: '🇳🇬', code: '+234', placeholder: '8XX XXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Ouganda',               flag: '🇺🇬', code: '+256', placeholder: '7X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Rwanda',                flag: '🇷🇼', code: '+250', placeholder: '7XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'São Tomé-et-Príncipe',  flag: '🇸🇹', code: '+239', placeholder: '9XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Sénégal',               flag: '🇸🇳', code: '+221', placeholder: '7X XXX XX XX',   regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Seychelles',            flag: '🇸🇨', code: '+248', placeholder: '2XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Sierra Leone',          flag: '🇸🇱', code: '+232', placeholder: '7X XXX XXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Somalie',               flag: '🇸🇴', code: '+252', placeholder: '6X XXX XXXX',    regex: /^\d{8,9}$/,          maxLength: 9  },
  { name: 'Soudan',                flag: '🇸🇩', code: '+249', placeholder: '9X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Soudan du Sud',         flag: '🇸🇸', code: '+211', placeholder: '9X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Tanzanie',              flag: '🇹🇿', code: '+255', placeholder: '7X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Tchad',                 flag: '🇹🇩', code: '+235', placeholder: '6X XX XX XX',    regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Togo',                  flag: '🇹🇬', code: '+228', placeholder: '9X XX XX XX',    regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Tunisie',               flag: '🇹🇳', code: '+216', placeholder: '2X XXX XXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Zambie',                flag: '🇿🇲', code: '+260', placeholder: '9X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Zimbabwe',              flag: '🇿🇼', code: '+263', placeholder: '7X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  // Europe
  { name: 'Albanie',               flag: '🇦🇱', code: '+355', placeholder: '6X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Allemagne',             flag: '🇩🇪', code: '+49',  placeholder: '15X XXXXXXXX',   regex: /^\d{10,11}$/,        maxLength: 11 },
  { name: 'Andorre',               flag: '🇦🇩', code: '+376', placeholder: '3XX XXX',         regex: /^\d{6}$/,            maxLength: 6  },
  { name: 'Autriche',              flag: '🇦🇹', code: '+43',  placeholder: '6XX XXXXXXX',    regex: /^\d{9,11}$/,         maxLength: 11 },
  { name: 'Biélorussie',           flag: '🇧🇾', code: '+375', placeholder: '2X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Belgique',              flag: '🇧🇪', code: '+32',  placeholder: '47X XX XX XX',   regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Bosnie-Herzégovine',    flag: '🇧🇦', code: '+387', placeholder: '6X XXX XXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Bulgarie',              flag: '🇧🇬', code: '+359', placeholder: '8X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Chypre',                flag: '🇨🇾', code: '+357', placeholder: '9X XXX XXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Croatie',               flag: '🇭🇷', code: '+385', placeholder: '9X XXX XXXX',    regex: /^\d{8,9}$/,          maxLength: 9  },
  { name: 'Danemark',              flag: '🇩🇰', code: '+45',  placeholder: '2X XX XX XX',    regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Espagne',               flag: '🇪🇸', code: '+34',  placeholder: '6XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Estonie',               flag: '🇪🇪', code: '+372', placeholder: '5XXX XXXX',      regex: /^\d{7,8}$/,          maxLength: 8  },
  { name: 'Finlande',              flag: '🇫🇮', code: '+358', placeholder: '4X XXX XXXX',    regex: /^\d{9,10}$/,         maxLength: 10 },
  { name: 'France',                flag: '🇫🇷', code: '+33',  placeholder: '6XX XX XX XX',   regex: /^(0?[67]\d{8})$/,   maxLength: 10 },
  { name: 'Grèce',                 flag: '🇬🇷', code: '+30',  placeholder: '6XX XXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Hongrie',               flag: '🇭🇺', code: '+36',  placeholder: '3X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Irlande',               flag: '🇮🇪', code: '+353', placeholder: '8X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Islande',               flag: '🇮🇸', code: '+354', placeholder: '6XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Italie',                flag: '🇮🇹', code: '+39',  placeholder: '3XX XXX XXXX',   regex: /^\d{9,10}$/,         maxLength: 10 },
  { name: 'Kosovo',                flag: '🇽🇰', code: '+383', placeholder: '4X XXX XXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Lettonie',              flag: '🇱🇻', code: '+371', placeholder: '2X XXX XXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Liechtenstein',         flag: '🇱🇮', code: '+423', placeholder: '7XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Lituanie',              flag: '🇱🇹', code: '+370', placeholder: '6X XXX XXXX',    regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Luxembourg',            flag: '🇱🇺', code: '+352', placeholder: '6X XXX XXX',     regex: /^\d{8,9}$/,          maxLength: 9  },
  { name: 'Macédoine du Nord',     flag: '🇲🇰', code: '+389', placeholder: '7X XXX XXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Malte',                 flag: '🇲🇹', code: '+356', placeholder: '7X XXX XXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Moldavie',              flag: '🇲🇩', code: '+373', placeholder: '7X XXX XXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Monaco',                flag: '🇲🇨', code: '+377', placeholder: '6XX XX XX XX',   regex: /^\d{8,9}$/,          maxLength: 9  },
  { name: 'Monténégro',            flag: '🇲🇪', code: '+382', placeholder: '6X XXX XXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Norvège',               flag: '🇳🇴', code: '+47',  placeholder: '4X XX XX XX',    regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Pays-Bas',              flag: '🇳🇱', code: '+31',  placeholder: '6XX XXX XXXX',   regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Pologne',               flag: '🇵🇱', code: '+48',  placeholder: '5XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Portugal',              flag: '🇵🇹', code: '+351', placeholder: '9XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'République tchèque',    flag: '🇨🇿', code: '+420', placeholder: '6XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Roumanie',              flag: '🇷🇴', code: '+40',  placeholder: '7XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Royaume-Uni',           flag: '🇬🇧', code: '+44',  placeholder: '7XXX XXXXXX',    regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Russie',                flag: '🇷🇺', code: '+7',   placeholder: '9XX XXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Serbie',                flag: '🇷🇸', code: '+381', placeholder: '6X XXX XXXX',    regex: /^\d{8,9}$/,          maxLength: 9  },
  { name: 'Slovaquie',             flag: '🇸🇰', code: '+421', placeholder: '9XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Slovénie',              flag: '🇸🇮', code: '+386', placeholder: '3X XXX XXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Suède',                 flag: '🇸🇪', code: '+46',  placeholder: '7X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Suisse',                flag: '🇨🇭', code: '+41',  placeholder: '7X XXX XX XX',   regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Ukraine',               flag: '🇺🇦', code: '+380', placeholder: '5X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  // Amériques
  { name: 'Argentine',             flag: '🇦🇷', code: '+54',  placeholder: '9 11 XXXX XXXX', regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Bolivie',               flag: '🇧🇴', code: '+591', placeholder: '7X XXX XXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Brésil',                flag: '🇧🇷', code: '+55',  placeholder: '11 9XXXX XXXX',  regex: /^\d{10,11}$/,        maxLength: 11 },
  { name: 'Canada',                flag: '🇨🇦', code: '+1',   placeholder: '4XX XXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Chili',                 flag: '🇨🇱', code: '+56',  placeholder: '9 XXXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Colombie',              flag: '🇨🇴', code: '+57',  placeholder: '3XX XXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Costa Rica',            flag: '🇨🇷', code: '+506', placeholder: '8XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Cuba',                  flag: '🇨🇺', code: '+53',  placeholder: '5XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Équateur',              flag: '🇪🇨', code: '+593', placeholder: '9X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'États-Unis',            flag: '🇺🇸', code: '+1',   placeholder: '201 555 0123',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Guatemala',             flag: '🇬🇹', code: '+502', placeholder: '5XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Haïti',                 flag: '🇭🇹', code: '+509', placeholder: '3X XX XXXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Honduras',              flag: '🇭🇳', code: '+504', placeholder: '9XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Jamaïque',              flag: '🇯🇲', code: '+1876',placeholder: '3XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Mexique',               flag: '🇲🇽', code: '+52',  placeholder: '1 XXX XXX XXXX', regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Nicaragua',             flag: '🇳🇮', code: '+505', placeholder: '8XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Panama',                flag: '🇵🇦', code: '+507', placeholder: '6XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Paraguay',              flag: '🇵🇾', code: '+595', placeholder: '9X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Pérou',                 flag: '🇵🇪', code: '+51',  placeholder: '9XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'République dominicaine',flag: '🇩🇴', code: '+1809',placeholder: '2XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Salvador',              flag: '🇸🇻', code: '+503', placeholder: '7XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Trinité-et-Tobago',     flag: '🇹🇹', code: '+1868',placeholder: '2XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Uruguay',               flag: '🇺🇾', code: '+598', placeholder: '9X XXX XXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Venezuela',             flag: '🇻🇪', code: '+58',  placeholder: '4XX XXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  // Asie
  { name: 'Afghanistan',           flag: '🇦🇫', code: '+93',  placeholder: '7X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Arabie Saoudite',       flag: '🇸🇦', code: '+966', placeholder: '5X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Arménie',               flag: '🇦🇲', code: '+374', placeholder: '5X XXX XXX',     regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Azerbaïdjan',           flag: '🇦🇿', code: '+994', placeholder: '5X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Bahreïn',               flag: '🇧🇭', code: '+973', placeholder: '3XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Bangladesh',            flag: '🇧🇩', code: '+880', placeholder: '1XXX XXX XXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Birmanie',              flag: '🇲🇲', code: '+95',  placeholder: '9X XXX XXXX',    regex: /^\d{8,9}$/,          maxLength: 9  },
  { name: 'Brunei',                flag: '🇧🇳', code: '+673', placeholder: '7XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Cambodge',              flag: '🇰🇭', code: '+855', placeholder: '1X XXX XXXX',    regex: /^\d{8,9}$/,          maxLength: 9  },
  { name: 'Chine',                 flag: '🇨🇳', code: '+86',  placeholder: '1XX XXXX XXXX',  regex: /^\d{11}$/,           maxLength: 11 },
  { name: 'Corée du Sud',          flag: '🇰🇷', code: '+82',  placeholder: '1X XXXX XXXX',   regex: /^\d{9,10}$/,         maxLength: 10 },
  { name: 'Émirats arabes unis',   flag: '🇦🇪', code: '+971', placeholder: '5X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Géorgie',               flag: '🇬🇪', code: '+995', placeholder: '5XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Inde',                  flag: '🇮🇳', code: '+91',  placeholder: '9XXXXXXXXX',     regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Indonésie',             flag: '🇮🇩', code: '+62',  placeholder: '8XX XXX XXXX',   regex: /^\d{9,12}$/,         maxLength: 12 },
  { name: 'Irak',                  flag: '🇮🇶', code: '+964', placeholder: '7XX XXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Iran',                  flag: '🇮🇷', code: '+98',  placeholder: '9XX XXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Israël',                flag: '🇮🇱', code: '+972', placeholder: '5X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Japon',                 flag: '🇯🇵', code: '+81',  placeholder: '9X XXXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Jordanie',              flag: '🇯🇴', code: '+962', placeholder: '7X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Kazakhstan',            flag: '🇰🇿', code: '+7',   placeholder: '7XX XXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Kirghizstan',           flag: '🇰🇬', code: '+996', placeholder: '7XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Koweït',                flag: '🇰🇼', code: '+965', placeholder: '5XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Laos',                  flag: '🇱🇦', code: '+856', placeholder: '20 XX XXX XXX',  regex: /^\d{9,10}$/,         maxLength: 10 },
  { name: 'Liban',                 flag: '🇱🇧', code: '+961', placeholder: '7X XXX XXX',     regex: /^\d{7,8}$/,          maxLength: 8  },
  { name: 'Malaisie',              flag: '🇲🇾', code: '+60',  placeholder: '1X XXXX XXXX',   regex: /^\d{9,10}$/,         maxLength: 10 },
  { name: 'Maldives',              flag: '🇲🇻', code: '+960', placeholder: '7XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Mongolie',              flag: '🇲🇳', code: '+976', placeholder: '8XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Népal',                 flag: '🇳🇵', code: '+977', placeholder: '9XX XXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Oman',                  flag: '🇴🇲', code: '+968', placeholder: '9XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Ouzbékistan',           flag: '🇺🇿', code: '+998', placeholder: '9X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Pakistan',              flag: '🇵🇰', code: '+92',  placeholder: '3XX XXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Palestine',             flag: '🇵🇸', code: '+970', placeholder: '5X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Philippines',           flag: '🇵🇭', code: '+63',  placeholder: '9XX XXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Qatar',                 flag: '🇶🇦', code: '+974', placeholder: '5XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Singapour',             flag: '🇸🇬', code: '+65',  placeholder: '8XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Sri Lanka',             flag: '🇱🇰', code: '+94',  placeholder: '7X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Syrie',                 flag: '🇸🇾', code: '+963', placeholder: '9XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Tadjikistan',           flag: '🇹🇯', code: '+992', placeholder: '9X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Taïwan',                flag: '🇹🇼', code: '+886', placeholder: '9XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Thaïlande',             flag: '🇹🇭', code: '+66',  placeholder: '8X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Timor oriental',        flag: '🇹🇱', code: '+670', placeholder: '7XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Turkménistan',          flag: '🇹🇲', code: '+993', placeholder: '6X XXXXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Turquie',               flag: '🇹🇷', code: '+90',  placeholder: '5XX XXX XXXX',   regex: /^\d{10}$/,           maxLength: 10 },
  { name: 'Vietnam',               flag: '🇻🇳', code: '+84',  placeholder: '9X XXX XXXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Yémen',                 flag: '🇾🇪', code: '+967', placeholder: '7XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  // Océanie
  { name: 'Australie',             flag: '🇦🇺', code: '+61',  placeholder: '4XX XXX XXX',    regex: /^\d{9}$/,            maxLength: 9  },
  { name: 'Fidji',                 flag: '🇫🇯', code: '+679', placeholder: '7XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Nouvelle-Zélande',      flag: '🇳🇿', code: '+64',  placeholder: '2X XXX XXXX',    regex: /^\d{8,9}$/,          maxLength: 9  },
  { name: 'Papouasie-Nvl-Guinée',  flag: '🇵🇬', code: '+675', placeholder: '7XXX XXXX',      regex: /^\d{8}$/,            maxLength: 8  },
  { name: 'Samoa',                 flag: '🇼🇸', code: '+685', placeholder: '7X XXXXX',       regex: /^\d{7}$/,            maxLength: 7  },
  { name: 'Vanuatu',               flag: '🇻🇺', code: '+678', placeholder: '5XX XXXX',       regex: /^\d{7}$/,            maxLength: 7  },
];

interface CountryPickerBottomSheetProps {
  visible: boolean;
  selected: Country;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function CountryPickerBottomSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: CountryPickerBottomSheetProps) {
  const [search, setSearch] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    if (!visible) { setSearch(''); setKeyboardHeight(0); }
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.includes(q)
    );
  }, [search]);

  const handleSelect = (country: Country) => {
    onSelect(country);
    setSearch('');
    onClose();
  };

  const bg = isDark ? theme.color.dark.background.primary : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1A1A1A';
  const subColor = isDark ? '#AAAAAA' : '#666666';
  const borderColor = isDark ? '#333333' : '#E5E5E5';
  const inputBg = isDark ? theme.color.dark.background.secondary : '#F5F5F5';

  const maxSheetHeight = SCREEN_HEIGHT * 0.85 - keyboardHeight;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      backdropOpacity={0.5}
      propagateSwipe
      swipeDirection="down"
      onSwipeComplete={onClose}
      avoidKeyboard={false}
      useNativeDriver
    >
      <View style={[styles.sheet, { backgroundColor: bg, height: maxSheetHeight, marginBottom: keyboardHeight }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Choisir un pays</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={22} color={subColor} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchWrapper, { backgroundColor: inputBg, borderColor }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={subColor} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un pays ou indicatif..."
            placeholderTextColor={subColor}
            style={[styles.searchInput, { color: textColor }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={subColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(_, i) => i.toString()}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: borderColor }]} />}
          renderItem={({ item }) => {
            const isSelected = item.code === selected.code && item.name === selected.name;
            return (
              <TouchableOpacity
                style={[styles.item, isSelected && { backgroundColor: isDark ? '#1a2e1a' : '#f0faf0' }]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.flag}>{item.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.countryName, { color: textColor }]}>{item.name}</Text>
                </View>
                <Text style={[styles.dialCode, { color: theme.color.primary[500] }]}>{item.code}</Text>
                {isSelected && (
                  <MaterialCommunityIcons name="check" size={18} color={theme.color.primary[500]} style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: subColor }}>Aucun pays trouvé</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  flag: {
    fontSize: 24,
    marginRight: 14,
  },
  countryName: {
    fontSize: 15,
    fontWeight: '500',
  },
  dialCode: {
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    marginLeft: 58,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
});
