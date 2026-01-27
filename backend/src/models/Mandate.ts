import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface MandateAttributes {
  id: string;
  order_id: string;
  customer_account_id: string;
  onepipe_mandate_id: string;
  virtual_account: string | null;
  amount_per_installment: number;
  total_installments: number;
  installments_paid: number;
  start_date: Date;
  end_date: Date;
  status: "pending_auth" | "active" | "completed" | "failed" | "replaced";
  replaced_by_mandate_id: string | null;
  created_at: Date;
}

interface MandateCreationAttributes extends Optional<
  MandateAttributes,
  | "id"
  | "virtual_account"
  | "installments_paid"
  | "replaced_by_mandate_id"
  | "created_at"
> {}

class Mandate
  extends Model<MandateAttributes, MandateCreationAttributes>
  implements MandateAttributes
{
  public id!: string;
  public order_id!: string;
  public customer_account_id!: string;
  public onepipe_mandate_id!: string;
  public virtual_account!: string | null;
  public amount_per_installment!: number;
  public total_installments!: number;
  public installments_paid!: number;
  public start_date!: Date;
  public end_date!: Date;
  public status!:
    | "pending_auth"
    | "active"
    | "completed"
    | "failed"
    | "replaced";
  public replaced_by_mandate_id!: string | null;
  public created_at!: Date;
}

Mandate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "orders",
        key: "id",
      },
    },
    customer_account_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "customer_accounts",
        key: "id",
      },
    },
    onepipe_mandate_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    virtual_account: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    amount_per_installment: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    total_installments: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    installments_paid: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "pending_auth",
        "active",
        "completed",
        "failed",
        "replaced",
      ),
      allowNull: false,
      defaultValue: "pending_auth",
    },
    replaced_by_mandate_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "mandates",
        key: "id",
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "mandates",
    timestamps: false,
  },
);

export default Mandate;
