import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
  TableCaption,
  tableVariants,
} from "@/components/ui/table";

describe("Unified Global Table Component", () => {
  describe("Variants & Density", () => {
    it("renders default table with responsive container and standard borders", () => {
      const html = renderToStaticMarkup(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>VL-TEE-01</TableCell>
              <TableCell>৳1,200</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(html).toContain("data-slot=\"table-container\"");
      expect(html).toContain("data-slot=\"table\"");
      expect(html).toContain("data-density=\"default\"");
      expect(html).toContain("VL-TEE-01");
      expect(html).toContain("৳1,200");
    });

    it("renders compact density for high-volume POS and receipt views", () => {
      const cls = tableVariants({ density: "compact" });
      expect(cls).toContain("[&_td]:px-2.5");
      expect(cls).toContain("[&_td]:py-2");

      const html = renderToStaticMarkup(
        <Table density="compact">
          <TableBody>
            <TableRow>
              <TableCell>Item</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(html).toContain("data-density=\"compact\"");
    });

    it("renders striped variant for alternating row readability", () => {
      const cls = tableVariants({ variant: "striped" });
      expect(cls).toContain("[&_tbody_tr:nth-child(even)]:bg-neutral-50/50");

      const html = renderToStaticMarkup(
        <Table variant="striped">
          <TableBody>
            <TableRow>
              <TableCell>Row 1</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(html).toContain("data-variant=\"striped\"");
    });

    it("supports hideContainer when embedded inside custom cards", () => {
      const html = renderToStaticMarkup(
        <Table hideContainer>
          <TableBody>
            <TableRow>
              <TableCell>Embedded</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(html).not.toContain("data-slot=\"table-container\"");
      expect(html).toContain("data-slot=\"table\"");
    });
  });

  describe("Subcomponents", () => {
    it("renders footer and caption correctly", () => {
      const html = renderToStaticMarkup(
        <Table>
          <TableCaption>Invoice summary table</TableCaption>
          <TableFooter>
            <TableRow>
              <TableCell>Total: ৳5,000</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(html).toContain("Invoice summary table");
      expect(html).toContain("data-slot=\"table-caption\"");
      expect(html).toContain("data-slot=\"table-footer\"");
    });
  });
});
