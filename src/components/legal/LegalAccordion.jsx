import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function LegalAccordion({ items = [], idPrefix = "legal-acc" }) {
  return (
    <Accordion type="single" collapsible>
      {items.map((item, index) => (
        <AccordionItem key={item.title} value={`${idPrefix}-${index}`} className="border-border/30">
          <AccordionTrigger className="text-left text-sm text-foreground hover:no-underline">
            {item.title}
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
