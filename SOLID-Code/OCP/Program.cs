namespace OCP
{
    internal class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello, World!");
        }
    }


    //public class Account
    //{
    //    public string Name { get; set; }

    //    public string Address { get; set; }

    //    public double Balance { get; set; }

    //    public double CalculateInterest(string accountType)
    //    {
    //        if(accountType == "Saving")
    //        {
    //            return Balance * 0.3;
    //        }
    //        else
    //        {
    //            return Balance * 0.5;
    //        }            
    //    }
    //}

    public class Account
    {
        public string Name { get; set; }
        public string Address { get; set; }
        public double Balance { get; set; }
    }

    interface IAccount
    {
        double CalculateInterest(Account account);
    }

    public class SavingAccount : IAccount
    {
        public double CalculateInterest(Account account)
        {
            return account.Balance * 0.3;
        }
    }

    public class OtherAccount : IAccount
    {
        public double CalculateInterest(Account account)
        {
            return account.Balance * 0.5;
        }
    }

    public class CurrentAccount : IAccount
    {
        public double CalculateInterest(Account account)
        {
            return account.Balance * 0.7;
        }
    }
}