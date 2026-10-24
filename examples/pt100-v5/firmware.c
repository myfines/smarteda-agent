/* ATmega328p, 8 MHz, AVCC/ADC reference 3.3 V.
 * ADC0=conditioned temperature; PC1=LOW, PC2=HIGH, PC3=OVERTEMP.
 * HD44780: RS=PD2,E=PD3,D4..D7=PD4..PD7; RW grounded.
 * USART0: 9600 8N1. PB5 heartbeat. No heater actuator is driven.
 */
#define F_CPU 8000000UL
#include <avr/io.h>
#include <util/delay.h>
#include <stdint.h>
#include <math.h>
#include "../pt100-v4/pt100.h"
static void uart_char(char c){while(!(UCSR0A&_BV(UDRE0))){}UDR0=c;}
static void uart(const char*s){while(*s)uart_char(*s++);}
static void number(uint16_t v){char b[6];uint8_t n=0;do{b[n++]=(char)('0'+v%10);v/=10;}while(v);while(n)uart_char(b[--n]);}
static void nibble(uint8_t v){PORTD=(PORTD&0x0f)|(v<<4);PORTD|=_BV(PD3);_delay_us(2);PORTD&=~_BV(PD3);_delay_us(50);}
static void lcd_byte(uint8_t b,uint8_t rs){if(rs)PORTD|=_BV(PD2);else PORTD&=~_BV(PD2);nibble(b>>4);nibble(b&15);}
static void lcd_line(uint8_t line,const char*s){lcd_byte(line?0xc0:0x80,0);for(uint8_t i=0;i<16;i++)lcd_byte(*s?*s++:' ',1);}
static void lcd_init(void){DDRD|=0xfc;_delay_ms(50);nibble(3);_delay_ms(5);nibble(3);_delay_us(150);nibble(3);nibble(2);lcd_byte(0x28,0);lcd_byte(0x0c,0);lcd_byte(0x06,0);lcd_byte(0x01,0);_delay_ms(2);}
static uint16_t adc(void){ADCSRA|=_BV(ADSC);while(ADCSRA&_BV(ADSC)){}return ADC;}
int main(void){
 UBRR0=51;UCSR0B=_BV(TXEN0);UCSR0C=_BV(UCSZ01)|_BV(UCSZ00);
 DDRB|=_BV(PB5);DDRC=0;PORTC=0;
 ADMUX=_BV(REFS0);ADCSRA=_BV(ADEN)|_BV(ADPS2)|_BV(ADPS1);DIDR0=_BV(ADC0D);
 lcd_init();lcd_line(0,"PT100 WARMUP");lcd_line(1,"ADC0 / 3.3V");uart("BOOT PT100 V5\r\n");_delay_ms(100);
 const pt100_cal cal={0,1.54022,3.3,1023};
 for(;;){
  uint32_t sum=0;for(uint8_t i=0;i<16;i++)sum+=adc();uint16_t code=(uint16_t)((sum+8)/16);
  uint8_t flags=PINC;pt100_result r=pt100_decode(code,!!(flags&_BV(PC1)),!!(flags&_BV(PC2)),!!(flags&_BV(PC3)),1,&cal);
  const char*status="INVALID";char line[17]="T=---.-- C";
  if(r.status==PT100_OK){
   status=r.overtemp?"OVERTEMP":"OK";uint16_t centi=(uint16_t)lround(r.temperature_c*100);
   line[2]='0'+centi/10000%10;line[3]='0'+centi/1000%10;line[4]='0'+centi/100%10;line[5]='.';line[6]='0'+centi/10%10;line[7]='0'+centi%10;line[8]=' ';line[9]='C';line[10]=0;
  }else if(r.status==PT100_SENSOR_LOW)status="SENSOR_LOW";
  else if(r.status==PT100_SENSOR_HIGH)status="SENSOR_HIGH";
  else if(r.status==PT100_OUT_OF_RANGE)status="OUT_OF_RANGE";
  lcd_line(0,line);lcd_line(1,status);uart("ADC=");number(code);uart(" T=");uart(line+2);uart(" STATUS=");uart(status);uart("\r\n");
  PORTB^=_BV(PB5);_delay_ms(100);
 }
}
